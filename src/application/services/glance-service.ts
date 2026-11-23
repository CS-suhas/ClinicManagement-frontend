import { hasRole } from "@/application/auth/permissions";
import type { CurrentUser } from "@/domain/auth";
import {
  type AppointmentSettings,
  type AppointmentStatus,
  clockToMinutes,
  isWithinClinicHours,
  minutesToClock,
  overlapsBusyStart,
} from "@/domain/entities";
import { ForbiddenError } from "@/domain/errors";
import { addDays, toOffsetDateTime } from "@/domain/local-time";
import type {
  AppointmentListItem,
  ProviderDirectoryEntry,
} from "@/domain/repositories";
import type {
  AllergyEntry,
  AllergyUsage,
  ClinicDoctorPreview,
  ClinicDoctorRef,
  ClinicSummary,
  PatientSummary,
  ProviderSummary,
  VisitCounts,
  VisitFact,
} from "@/domain/repositories/glance";
import type { AppointmentService } from "./appointment-service";
import type { ClinicJoinService } from "./clinic-join-service";
import type { ClinicService } from "./clinic-service";
import type { ConfigurationService } from "./configuration-service";
import type { PatientAllergyService } from "./patient-allergy-service";
import type { PatientService } from "./patient-service";
import type { ProviderService } from "./provider-service";

/** Appointment pages read per summary; keeps a runaway backend from stalling a card. */
const MAX_APPOINTMENT_PAGES = 5;
const APPOINTMENT_PAGE_SIZE = 100;
const DIRECTORY_PAGE_SIZE = 100;
const MAX_DIRECTORY_PAGES = 5;
const ALLERGY_PAGE_SIZE = 50;
const SLOT_SEARCH_DAYS = 7;

const pad = (n: number) => String(n).padStart(2, "0");

/** Local "YYYY-MM-DD" for an epoch ms. */
export function localDayOf(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const timeOf = (iso: string) => Date.parse(iso);

const isCancelledOrDeclined = (status: AppointmentStatus) =>
  status === "CANCELLED" || status === "DECLINED";

export function toVisitFact(item: AppointmentListItem): VisitFact {
  return {
    id: item.id,
    appointmentDateTime: item.appointmentDateTime,
    reasonForVisit: item.reasonForVisit,
    patientId: item.patientId,
    patientName: item.patientName,
    providerId: item.providerId,
    providerName: item.providerName,
    status: item.status,
  };
}

/**
 * Derives a patient's glance facts from their appointments. Pure: `now` is
 * passed in. Last and next visits ignore DECLINED and CANCELLED, as the roster does.
 */
export function summarizeVisitFacts(
  appointments: AppointmentListItem[],
  now: number,
): {
  counts: VisitCounts;
  lastVisit: VisitFact | null;
  nextVisit: VisitFact | null;
  recent: VisitFact[];
} {
  const newestFirst = [...appointments]
    .sort(
      (a, b) => timeOf(b.appointmentDateTime) - timeOf(a.appointmentDateTime),
    )
    .map(toVisitFact);
  const counts: VisitCounts = {
    total: appointments.length,
    requested: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    declined: 0,
  };
  for (const item of appointments) {
    if (item.status === "REQUESTED") counts.requested++;
    else if (item.status === "CONFIRMED") counts.confirmed++;
    else if (item.status === "COMPLETED") counts.completed++;
    else if (item.status === "CANCELLED") counts.cancelled++;
    else if (item.status === "DECLINED") counts.declined++;
  }
  const counted = newestFirst.filter((v) => !isCancelledOrDeclined(v.status));
  const lastVisit =
    counted.find((v) => timeOf(v.appointmentDateTime) < now) ?? null;
  const nextVisit =
    [...counted].reverse().find((v) => timeOf(v.appointmentDateTime) >= now) ??
    null;
  return { counts, lastVisit, nextVisit, recent: newestFirst.slice(0, 3) };
}

/** Number of bookable slot starts in a day: from opening, stepping by the duration, within hours. */
export function slotCount(settings: AppointmentSettings): number {
  const opening = clockToMinutes(settings.clinicOpeningTime);
  if (opening === null) return 0;
  let count = 0;
  for (
    let m = opening;
    isWithinClinicHours(m, settings.appointmentDurationMinutes, settings);
    m += settings.appointmentDurationMinutes
  )
    count++;
  return count;
}

/**
 * ISO starts of the free slots on a local day that are after `nowMs`. Uses the
 * shared clinic-hours rule and the busy starts from the public availability read.
 */
export function freeSlotStarts(
  settings: AppointmentSettings,
  day: string,
  busyStarts: string[],
  nowMs: number,
): string[] {
  const opening = clockToMinutes(settings.clinicOpeningTime);
  if (opening === null) return [];
  const duration = settings.appointmentDurationMinutes;
  const free: string[] = [];
  for (
    let m = opening;
    isWithinClinicHours(m, duration, settings);
    m += duration
  ) {
    const iso = toOffsetDateTime(`${day}T${minutesToClock(m)}`);
    if (timeOf(iso) <= nowMs) continue;
    if (overlapsBusyStart(iso, duration, busyStarts)) continue;
    free.push(iso);
  }
  return free;
}

/** The patient-allergy record shape the glance needs, with the name resolved. */
const toAllergyEntry = (record: {
  allergyId: string;
  allergyName?: string;
  severity: string;
}): AllergyEntry => ({
  allergyId: record.allergyId,
  name: record.allergyName ?? record.allergyId,
  severity: record.severity,
});

/** Runs a read the caller may make. A 403 from the server omits the section; other errors propagate. */
async function allowedRead<T>(
  allowed: boolean,
  read: () => Promise<T>,
): Promise<T | null> {
  if (!allowed) return null;
  try {
    return await read();
  } catch (e) {
    if (e instanceof ForbiddenError) return null;
    throw e;
  }
}

/** Application-layer composition of the glance cards from existing services. */
export interface GlanceDependencies {
  patients: PatientService;
  patientAllergies: PatientAllergyService;
  appointments: AppointmentService;
  providers: ProviderService;
  clinics: ClinicService;
  clinicJoins: ClinicJoinService;
  configuration: ConfigurationService;
}

/**
 * The one place the glance cards read from. Each method composes existing
 * endpoints, checks the caller's role first so it never asks for something
 * the role may not read, and returns null for sections the server refuses.
 * When summary endpoints ship, replace a method's body with one request.
 */
export class GlanceService {
  constructor(
    private readonly deps: GlanceDependencies,
    private readonly currentUser: () => Promise<CurrentUser | null>,
  ) {}

  /** Every appointment matching the filter, up to MAX_APPOINTMENT_PAGES pages. */
  private async allAppointments(filter: {
    patientId?: string;
    providerId?: string;
    clinicId?: string;
    from?: string;
    to?: string;
  }): Promise<AppointmentListItem[]> {
    const items: AppointmentListItem[] = [];
    for (let page = 1; page <= MAX_APPOINTMENT_PAGES; page++) {
      const result = await this.deps.appointments.search({
        ...filter,
        page,
        pageSize: APPOINTMENT_PAGE_SIZE,
      });
      items.push(...result.items);
      if (result.items.length < APPOINTMENT_PAGE_SIZE) break;
      if (items.length >= result.totalCount) break;
    }
    return items;
  }

  /** Patient facts: record, allergies, visit counts and the nearest visits. */
  async getPatientSummary(patientId: string): Promise<PatientSummary> {
    const user = await this.currentUser();
    const canReadPatient =
      !!user &&
      (hasRole(user, "admin") ||
        hasRole(user, "clinicadmin") ||
        hasRole(user, "doctor") ||
        user.patient?.id === patientId);
    const [patient, allergies, appointments] = await Promise.all([
      allowedRead(canReadPatient, () => this.deps.patients.get(patientId)),
      allowedRead(canReadPatient, async () =>
        (
          await this.deps.patientAllergies.searchByPatient(patientId, {
            page: 1,
            pageSize: ALLERGY_PAGE_SIZE,
          })
        ).items.map(toAllergyEntry),
      ),
      allowedRead(!!user, () => this.allAppointments({ patientId })),
    ]);
    const visits = appointments
      ? summarizeVisitFacts(appointments, Date.now())
      : null;
    return {
      patient,
      allergies,
      lastVisit: visits?.lastVisit ?? null,
      nextVisit: visits?.nextVisit ?? null,
      counts: visits?.counts ?? null,
      recent: visits?.recent ?? null,
    };
  }

  /** Doctor facts: record, clinic, today's load, the next free slot and patient count. */
  async getProviderSummary(providerId: string): Promise<ProviderSummary> {
    const user = await this.currentUser();
    const provider = await allowedRead(!!user, () =>
      this.deps.providers.get(providerId),
    );
    const clinicId = provider?.clinicId || null;
    const seesSchedule =
      !!user &&
      (hasRole(user, "admin") ||
        (hasRole(user, "doctor") && user.provider?.id === providerId) ||
        (clinicId !== null && user.clinicAdminOf.includes(clinicId)));
    const now = Date.now();
    const today = localDayOf(now);
    const [clinic, todayCount, patientCount, availability] = await Promise.all([
      allowedRead(!!user && clinicId !== null, () =>
        this.deps.clinics.get(clinicId as string),
      ),
      allowedRead(seesSchedule, async () => {
        const dayStart = toOffsetDateTime(`${today}T00:00`);
        const result = await this.deps.appointments.search({
          providerId,
          from: dayStart,
          to: toOffsetDateTime(`${addDays(today, 1)}T00:00`),
          page: 1,
          pageSize: 1,
        });
        return result.totalCount;
      }),
      allowedRead(
        seesSchedule,
        async () =>
          (
            await this.deps.patients.listRoster({
              providerId,
              page: 1,
              pageSize: 1,
            })
          ).totalCount,
      ),
      this.availability(providerId, now),
    ]);
    return {
      provider,
      clinic,
      todayAppointmentCount: todayCount,
      todaySlots: availability.todaySlots,
      nextAvailableStart: availability.nextAvailableStart,
      patientCount,
    };
  }

  /**
   * Today's slot load and the next free start within a week. Uses the public
   * availability read and the appointment settings. Any failure here only
   * hides this section; the rest of the card still renders.
   */
  private async availability(
    providerId: string,
    now: number,
  ): Promise<{
    todaySlots: { busy: number; total: number } | null;
    nextAvailableStart: string | null;
  }> {
    try {
      const settings = await this.deps.configuration.getAppointmentSettings();
      const today = localDayOf(now);
      let todaySlots: { busy: number; total: number } | null = null;
      let nextAvailableStart: string | null = null;
      for (
        let offset = 0;
        offset < SLOT_SEARCH_DAYS && nextAvailableStart === null;
        offset++
      ) {
        const day = addDays(today, offset);
        const busy = await this.deps.appointments.busyStarts(providerId, day);
        if (offset === 0)
          todaySlots = { busy: busy.length, total: slotCount(settings) };
        nextAvailableStart =
          freeSlotStarts(settings, day, busy, now)[0] ?? null;
      }
      return { todaySlots, nextAvailableStart };
    } catch {
      return { todaySlots: null, nextAvailableStart: null };
    }
  }

  /** The next free slot only, for cards that need no other facts. */
  async getNextFreeSlot(providerId: string): Promise<string | null> {
    return (await this.availability(providerId, Date.now())).nextAvailableStart;
  }

  /** The doctor's next upcoming appointments, for the provider table expansion. Staff only. */
  async getProviderUpcoming(
    providerId: string,
    limit = 5,
  ): Promise<VisitFact[]> {
    const user = await this.currentUser();
    const allowed =
      !!user &&
      (hasRole(user, "admin") ||
        (hasRole(user, "doctor") && user.provider?.id === providerId));
    const items = await allowedRead(allowed, () =>
      this.deps.appointments
        .search({
          providerId,
          from: toOffsetDateTime(`${localDayOf(Date.now())}T00:00`),
          page: 1,
          pageSize: limit,
        })
        .then((result) => result.items),
    );
    return (items ?? []).map(toVisitFact);
  }

  /** Clinic facts: record, verified doctors, specialties, and staff-only counts. */
  async getClinicSummary(clinicId: string): Promise<ClinicSummary> {
    const user = await this.currentUser();
    const isStaff =
      !!user &&
      (hasRole(user, "admin") || user.clinicAdminOf.includes(clinicId));
    const [clinic, directory, todayCount, pending] = await Promise.all([
      allowedRead(!!user, () => this.deps.clinics.get(clinicId)),
      this.deps.providers.directory({
        clinicId,
        page: 1,
        pageSize: DIRECTORY_PAGE_SIZE,
      }),
      allowedRead(isStaff, async () => {
        const today = localDayOf(Date.now());
        const result = await this.deps.appointments.search({
          clinicId,
          from: toOffsetDateTime(`${today}T00:00`),
          to: toOffsetDateTime(`${addDays(today, 1)}T00:00`),
          page: 1,
          pageSize: 1,
        });
        return result.totalCount;
      }),
      allowedRead(
        isStaff,
        async () =>
          (await this.deps.clinicJoins.listForClinic(clinicId, "PENDING"))
            .length,
      ),
    ]);
    return {
      clinic,
      providerCount: directory.totalCount,
      providers: directory.items.slice(0, 5).map(toDoctorRef),
      topSpecialties: topSpecialties(directory.items),
      todayAppointmentCount: todayCount,
      pendingJoinRequestCount: pending,
    };
  }

  /**
   * Doctors per clinic for a list table, from the public directory read in
   * full (up to MAX_DIRECTORY_PAGES pages of 100), in one pass.
   */
  async getClinicDoctorPreview(): Promise<Map<string, ClinicDoctorPreview>> {
    const entries: ProviderDirectoryEntry[] = [];
    for (let page = 1; page <= MAX_DIRECTORY_PAGES; page++) {
      const result = await this.deps.providers.directory({
        page,
        pageSize: DIRECTORY_PAGE_SIZE,
      });
      entries.push(...result.items);
      if (entries.length >= result.totalCount || result.items.length === 0)
        break;
    }
    const byClinic = new Map<string, ClinicDoctorPreview>();
    for (const entry of entries) {
      const preview = byClinic.get(entry.clinicId) ?? { count: 0, doctors: [] };
      preview.count++;
      if (preview.doctors.length < 4) preview.doctors.push(toDoctorRef(entry));
      byClinic.set(entry.clinicId, preview);
    }
    return byClinic;
  }

  /**
   * One allergy's usage: patient count, severity mix and up to ten patients.
   * Names are read only for patients the caller may see; the rest show as null.
   */
  async getAllergyUsage(allergyId: string): Promise<AllergyUsage | null> {
    const user = await this.currentUser();
    const allowed =
      !!user &&
      (hasRole(user, "admin") ||
        hasRole(user, "clinicadmin") ||
        hasRole(user, "doctor"));
    const records = await allowedRead(allowed, () =>
      this.deps.patientAllergies.listByAllergy(allergyId),
    );
    if (records === null) return null;
    const severityCounts: Record<string, number> = {};
    for (const record of records)
      severityCounts[record.severity] =
        (severityCounts[record.severity] ?? 0) + 1;
    const patients = await Promise.all(
      records.slice(0, 10).map(async (record) => {
        const patient = await allowedRead(allowed, () =>
          this.deps.patients.get(record.patientId),
        );
        return {
          id: record.patientId,
          name: patient ? `${patient.firstName} ${patient.lastName}` : null,
        };
      }),
    );
    return { patientCount: records.length, severityCounts, patients };
  }
}

function toDoctorRef(entry: {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
}): ClinicDoctorRef {
  return {
    id: entry.id,
    firstName: entry.firstName,
    lastName: entry.lastName,
    specialty: entry.specialty,
  };
}

function topSpecialties(
  entries: { specialty: string }[],
): { specialty: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const { specialty } of entries) {
    const key = specialty.trim();
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts]
    .map(([specialty, count]) => ({ specialty, count }))
    .sort((a, b) => b.count - a.count || a.specialty.localeCompare(b.specialty))
    .slice(0, 3);
}
