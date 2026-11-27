import type { CurrentUser } from "@/domain/auth";
import {
  type AppointmentSettings,
  clockToMinutes,
  isWithinClinicHours,
  minutesToClock,
  overlapsBusyStart,
  type Provider,
  patientFullName,
} from "@/domain/entities";
import { ForbiddenError, NotFoundError } from "@/domain/errors";
import { addDays, toOffsetDateTime } from "@/domain/local-time";
import type {
  AppointmentListItem,
  ProviderDirectoryEntry,
  SummaryRepository,
  SummaryVisit,
} from "@/domain/repositories";
import type {
  AllergyUsage,
  ClinicDoctorPreview,
  ClinicDoctorRef,
  ClinicSummary,
  PatientSummary,
  ProviderSummary,
  VisitFact,
} from "@/domain/repositories/glance";
import { hasRole } from "@/features/auth/permissions";
import type { AppointmentService } from "./appointment-service";
import type { ConfigurationService } from "./configuration-service";
import type { PatientAllergyService } from "./patient-allergy-service";
import type { PatientService } from "./patient-service";
import type { ProviderService } from "./provider-service";

const DIRECTORY_PAGE_SIZE = 100;
const MAX_DIRECTORY_PAGES = 5;
const PREVIEW_DOCTORS = 8;
const SLOT_SEARCH_DAYS = 7;

const pad = (n: number) => String(n).padStart(2, "0");

export function localDayOf(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

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
    if (Date.parse(iso) <= nowMs) continue;
    if (overlapsBusyStart(iso, duration, busyStarts)) continue;
    free.push(iso);
  }
  return free;
}

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

async function unlessDenied<T>(read: () => Promise<T>): Promise<T | null> {
  try {
    return await read();
  } catch (e) {
    if (e instanceof ForbiddenError || e instanceof NotFoundError) return null;
    throw e;
  }
}

function toVisitFact(
  visit: SummaryVisit,
  patient: { id: string; firstName: string; lastName: string },
): VisitFact {
  return {
    id: visit.id,
    appointmentDateTime: visit.appointmentDateTime,
    reasonForVisit: visit.reasonForVisit,
    patientId: patient.id,
    patientName: patientFullName(patient),
    providerId: "",
    providerName: visit.providerName,
    status: visit.status,
  };
}

export type GlanceDependencies = {
  summaries: SummaryRepository;
  patients: PatientService;
  patientAllergies: PatientAllergyService;
  appointments: AppointmentService;
  providers: ProviderService;
  configuration: ConfigurationService;
};

export class GlanceService {
  constructor(
    private readonly deps: GlanceDependencies,
    private readonly currentUser: () => Promise<CurrentUser | null>,
  ) {}

  async getPatientSummary(patientId: string): Promise<PatientSummary> {
    const hidden: PatientSummary = {
      patient: null,
      allergies: null,
      lastVisit: null,
      nextVisit: null,
      counts: null,
      recent: null,
    };
    const user = await this.currentUser();
    if (!user) return hidden;
    const data = await unlessDenied(() =>
      this.deps.summaries.getPatientSummary(patientId),
    );
    if (!data) return hidden;
    const patient = data.patient;
    return {
      patient,
      allergies: data.allergies.map((a) => ({
        allergyId: a.allergyId,
        name: a.name,
        severity: a.severity,
      })),
      lastVisit: data.lastVisit ? toVisitFact(data.lastVisit, patient) : null,
      nextVisit: data.nextVisit ? toVisitFact(data.nextVisit, patient) : null,
      counts: data.counts,
      recent: data.recent.map((v) => toVisitFact(v, patient)),
    };
  }

  async getProviderSummary(providerId: string): Promise<ProviderSummary> {
    const user = await this.currentUser();
    const data = await unlessDenied(() =>
      this.deps.summaries.getProviderSummary(providerId),
    );
    const provider: Provider | null = data?.provider ?? null;
    const clinic = data?.clinic ?? null;
    const clinicId = provider?.clinicId ?? null;
    const seesSchedule =
      !!user &&
      (hasRole(user, "admin") ||
        (hasRole(user, "doctor") && user.provider?.id === providerId) ||
        (clinicId !== null && user.clinicAdminOf.includes(clinicId)));
    const now = Date.now();
    const [todaySlots, patientCount, nextAvailableStart] = await Promise.all([
      data ? this.todaySlots(providerId, localDayOf(now)) : null,
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
      data ? this.nextFreeSlot(providerId, data.nextAvailableStart, now) : null,
    ]);
    return {
      provider,
      clinic,
      todayAppointmentCount: seesSchedule
        ? (data?.todayAppointmentCount ?? null)
        : null,
      todaySlots,
      nextAvailableStart,
      patientCount,
    };
  }

  private async todaySlots(
    providerId: string,
    today: string,
  ): Promise<{ busy: number; total: number } | null> {
    try {
      const settings = await this.deps.configuration.getAppointmentSettings();
      const busy = await this.deps.appointments.busyStarts(providerId, today);
      return { busy: busy.length, total: slotCount(settings) };
    } catch {
      return null;
    }
  }

  private async nextFreeSlot(
    providerId: string,
    serverHint: string | null,
    now: number,
  ): Promise<string | null> {
    if (serverHint) return serverHint;
    try {
      const settings = await this.deps.configuration.getAppointmentSettings();
      const today = localDayOf(now);
      for (let offset = 0; offset < SLOT_SEARCH_DAYS; offset++) {
        const day = addDays(today, offset);
        const busy = await this.deps.appointments.busyStarts(providerId, day);
        const free = freeSlotStarts(settings, day, busy, now)[0];
        if (free) return free;
      }
      return null;
    } catch {
      return null;
    }
  }

  async getNextFreeSlot(providerId: string): Promise<string | null> {
    const data = await unlessDenied(() =>
      this.deps.summaries.getProviderSummary(providerId),
    );
    if (!data) return null;
    return this.nextFreeSlot(providerId, data.nextAvailableStart, Date.now());
  }

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
    return (items ?? []).map(toListVisitFact);
  }

  async getClinicSummary(clinicId: string): Promise<ClinicSummary> {
    const user = await this.currentUser();
    const empty: ClinicSummary = {
      clinic: null,
      providerCount: 0,
      providers: [],
      topSpecialties: [],
      todayAppointmentCount: null,
    };
    if (!user) return empty;
    const data = await unlessDenied(() =>
      this.deps.summaries.getClinicSummary(clinicId),
    );
    if (!data) return empty;
    const isStaff =
      hasRole(user, "admin") || user.clinicAdminOf.includes(clinicId);
    return {
      clinic: data.clinic,
      providerCount: data.providerCount,
      providers: data.providers.slice(0, 5).map(toDoctorRef),
      topSpecialties: data.topSpecialties,
      todayAppointmentCount: isStaff ? data.todayAppointmentCount : null,
    };
  }

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
      if (preview.doctors.length < PREVIEW_DOCTORS)
        preview.doctors.push(toDoctorRef(entry));
      byClinic.set(entry.clinicId, preview);
    }
    return byClinic;
  }

  async getAllergyUsage(allergyId: string): Promise<AllergyUsage | null> {
    const user = await this.currentUser();
    const allowed =
      !!user &&
      (hasRole(user, "admin") ||
        hasRole(user, "clinicadmin") ||
        hasRole(user, "doctor"));
    const patients = await allowedRead(allowed, () =>
      this.deps.patientAllergies.listPatientsByAllergy(allergyId),
    );
    if (patients === null) return null;
    return {
      patientCount: patients.length,
      patients: patients.slice(0, 10).map((patient) => ({
        id: patient.id,
        name: `${patient.firstName} ${patient.lastName}`,
      })),
    };
  }
}

function toListVisitFact(item: AppointmentListItem): VisitFact {
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
