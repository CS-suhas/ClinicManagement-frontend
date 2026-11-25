import type { CurrentUser } from "@/domain/auth";
import {
  type AllergyType,
  type Appointment,
  type AppointmentSettings,
  type AppointmentStatus,
  type Clinic,
  type ClinicJoinRequest,
  clockToMinutes,
  isWithinClinicHours,
  minutesToClock,
  overlapsBusyStart,
  type Patient,
  type PatientAllergy,
  type Provider,
  providerFullName,
} from "@/domain/entities";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/domain/errors";
import {
  addDays,
  localMidnightIso,
  toOffsetDateTime,
} from "@/domain/local-time";
import type {
  ClinicSummaryData,
  PatientSummaryData,
  ProviderSummaryData,
  SearchResults,
  SummaryProvider,
  SummaryRepository,
  SummaryVisit,
} from "@/domain/repositories";
import { delay } from "./local-storage-collection";

interface Listable<T> {
  list(): Promise<T[]>;
}

/** The lists the summaries read. Each is a plain store read, so no extra latency per list. */
export interface MockSummarySources {
  patients: Listable<Patient>;
  providers: Listable<Provider>;
  clinics: Listable<Clinic>;
  appointments: Listable<Appointment>;
  allergies: Listable<PatientAllergy>;
  allergyTypes: Listable<AllergyType>;
  joinRequests: Listable<Pick<ClinicJoinRequest, "clinicId" | "status">>;
  settings: AppointmentSettings;
}

const pad = (n: number) => String(n).padStart(2, "0");
const BLOCKING: ReadonlySet<AppointmentStatus> = new Set([
  "REQUESTED",
  "CONFIRMED",
]);
const INACTIVE: ReadonlySet<AppointmentStatus> = new Set([
  "DECLINED",
  "CANCELLED",
]);
const SEARCH_MAX_LIMIT = 20;
const CLINIC_PROVIDER_PREVIEW = 5;
const SLOT_SEARCH_DAYS = 14;

/** Local "YYYY-MM-DD" for now. The provider rules use local time. */
const localDay = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** The UTC day containing `ms`, as [start, end) epoch ms. The clinic count uses UTC, as the server does. */
function utcDayRange(ms: number): [number, number] {
  const d = new Date(ms);
  const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return [start, start + 86_400_000];
}

const localDayRange = (day: string): [number, number] => [
  Date.parse(localMidnightIso(day)),
  Date.parse(localMidnightIso(addDays(day, 1))),
];

/** Top three specialties by count, most common first, then by name. */
function topSpecialties(providers: Provider[]) {
  const counts = new Map<string, number>();
  for (const { specialty } of providers) {
    const key = specialty.trim();
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts]
    .map(([specialty, count]) => ({ specialty, count }))
    .sort((a, b) => b.count - a.count || a.specialty.localeCompare(b.specialty))
    .slice(0, 3);
}

/** Creates the mock summary and search port, applying the server's access rules. */
export function createMockSummaryRepository(
  sources: MockSummarySources,
  currentUser: () => Promise<CurrentUser | null>,
): SummaryRepository {
  const readAll = async () => {
    const [
      patients,
      providers,
      clinics,
      appointments,
      allergies,
      types,
      joins,
    ] = await Promise.all([
      sources.patients.list(),
      sources.providers.list(),
      sources.clinics.list(),
      sources.appointments.list(),
      sources.allergies.list(),
      sources.allergyTypes.list(),
      sources.joinRequests.list(),
    ]);
    return {
      patients,
      providers: new Map(providers.map((p) => [p.id, p])),
      clinics: new Map(clinics.map((c) => [c.id, c])),
      appointments,
      allergies,
      types: new Map(types.map((t) => [t.id, t])),
      joins,
    };
  };

  type Data = Awaited<ReturnType<typeof readAll>>;
  const clinicOf = (data: Data, appointment: Appointment) =>
    data.providers.get(appointment.providerId)?.clinicId ?? "";

  const toVisit = (data: Data, a: Appointment): SummaryVisit => ({
    id: a.id,
    appointmentDateTime: a.appointmentDateTime,
    reasonForVisit: a.reasonForVisit,
    status: a.status,
    providerName: providerFullName(
      data.providers.get(a.providerId) ?? { firstName: "", lastName: "" },
    ),
  });

  const toSummaryProvider = (data: Data, p: Provider): SummaryProvider => ({
    ...p,
    clinicName: data.clinics.get(p.clinicId)?.name ?? null,
  });

  return {
    async getPatientSummary(id: string): Promise<PatientSummaryData> {
      await delay();
      const user = await currentUser();
      if (!user) throw new UnauthorizedError();
      const data = await readAll();
      const isAdmin = user.roles.includes("admin");
      const patient = data.patients.find((p) => p.id === id);
      if (!patient) {
        if (isAdmin) throw new NotFoundError("Patient", id);
        throw new ForbiddenError();
      }

      // Broadest role wins: admin, the patient, a clinic admin with a visit at their
      // clinic, then a verified doctor with a visit with this patient.
      const forPatient = data.appointments.filter((a) => a.patientId === id);
      let visible: Appointment[] | null = null;
      if (isAdmin || user.patient?.id === id) visible = forPatient;
      if (visible === null && user.roles.includes("clinicadmin")) {
        const mine = forPatient.filter((a) =>
          user.clinicAdminOf.includes(clinicOf(data, a)),
        );
        if (mine.length > 0) visible = mine;
      }
      if (visible === null && user.roles.includes("doctor") && user.provider) {
        const own = forPatient.filter(
          (a) => a.providerId === user.provider?.id,
        );
        if (own.length > 0) visible = own;
      }
      if (visible === null) throw new ForbiddenError();

      const counts = {
        total: visible.length,
        requested: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        declined: 0,
      };
      for (const a of visible) {
        if (a.status === "REQUESTED") counts.requested++;
        else if (a.status === "CONFIRMED") counts.confirmed++;
        else if (a.status === "COMPLETED") counts.completed++;
        else if (a.status === "CANCELLED") counts.cancelled++;
        else if (a.status === "DECLINED") counts.declined++;
      }

      const now = Date.now();
      const newestFirst = [...visible].sort(
        (a, b) =>
          Date.parse(b.appointmentDateTime) - Date.parse(a.appointmentDateTime),
      );
      const counted = newestFirst.filter((a) => !INACTIVE.has(a.status));
      const lastVisit =
        counted.find((a) => Date.parse(a.appointmentDateTime) < now) ?? null;
      const nextVisit =
        [...counted]
          .reverse()
          .find((a) => Date.parse(a.appointmentDateTime) >= now) ?? null;

      return {
        patient: {
          id: patient.id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          dateOfBirth: patient.dateOfBirth,
          email: patient.email,
          phoneNumber: patient.phoneNumber,
        },
        allergies: data.allergies
          .filter((record) => record.patientId === id)
          .map((record) => ({
            allergyId: record.allergyId,
            name:
              record.allergyName ??
              data.types.get(record.allergyId)?.name ??
              record.allergyId,
            severity: record.severity,
          })),
        lastVisit: lastVisit ? toVisit(data, lastVisit) : null,
        nextVisit: nextVisit ? toVisit(data, nextVisit) : null,
        counts,
        recent: newestFirst.slice(0, 3).map((a) => toVisit(data, a)),
      };
    },

    async getClinicSummary(id: string): Promise<ClinicSummaryData> {
      await delay();
      const user = await currentUser();
      if (!user) throw new UnauthorizedError();
      const data = await readAll();
      const clinic = data.clinics.get(id);
      if (!clinic) throw new NotFoundError("Clinic", id);

      const verified = [...data.providers.values()].filter(
        (p) => p.verificationStatus === "VERIFIED" && p.clinicId === id,
      );
      const [dayStart, dayEnd] = utcDayRange(Date.now());
      const today = data.appointments.filter((a) => {
        if (clinicOf(data, a) !== id || INACTIVE.has(a.status)) return false;
        const time = Date.parse(a.appointmentDateTime);
        return time >= dayStart && time < dayEnd;
      }).length;
      const isStaff =
        user.roles.includes("admin") || user.clinicAdminOf.includes(id);

      return {
        clinic,
        providerCount: verified.length,
        todayAppointmentCount: today,
        pendingJoinRequestCount: isStaff
          ? data.joins.filter(
              (r) => r.clinicId === id && r.status === "PENDING",
            ).length
          : null,
        topSpecialties: topSpecialties(verified),
        providers: verified
          .slice(0, CLINIC_PROVIDER_PREVIEW)
          .map((p) => toSummaryProvider(data, p)),
      };
    },

    async getProviderSummary(id: string): Promise<ProviderSummaryData> {
      await delay();
      const data = await readAll();
      const provider = data.providers.get(id);
      const clinic = provider?.clinicId
        ? data.clinics.get(provider.clinicId)
        : undefined;
      if (provider?.verificationStatus !== "VERIFIED" || !clinic)
        throw new NotFoundError("Provider", id);

      const settings = sources.settings;
      const duration = settings.appointmentDurationMinutes;
      const busyOf = (day: string) => {
        const [from, to] = localDayRange(day);
        return data.appointments
          .filter((a) => {
            if (a.providerId !== id || !BLOCKING.has(a.status)) return false;
            const time = Date.parse(a.appointmentDateTime);
            return time >= from && time < to;
          })
          .map((a) => a.appointmentDateTime);
      };

      const now = Date.now();
      const today = localDay(now);
      let nextAvailableStart: string | null = null;
      for (
        let offset = 0;
        offset < SLOT_SEARCH_DAYS && !nextAvailableStart;
        offset++
      ) {
        const day = addDays(today, offset);
        const busy = busyOf(day);
        const opening = clockToMinutes(settings.clinicOpeningTime) ?? 0;
        for (
          let m = opening;
          isWithinClinicHours(m, duration, settings);
          m += duration
        ) {
          const iso = toOffsetDateTime(`${day}T${minutesToClock(m)}`);
          if (Date.parse(iso) <= now) continue;
          if (overlapsBusyStart(iso, duration, busy)) continue;
          nextAvailableStart = iso;
          break;
        }
      }

      const [from, to] = localDayRange(today);
      const todayCount = data.appointments.filter((a) => {
        if (a.providerId !== id || INACTIVE.has(a.status)) return false;
        const time = Date.parse(a.appointmentDateTime);
        return time >= from && time < to;
      }).length;

      return {
        provider: toSummaryProvider(data, provider),
        clinic,
        nextAvailableStart,
        todayAppointmentCount: todayCount,
      };
    },

    async search(q: string, limit: number): Promise<SearchResults> {
      await delay();
      const user = await currentUser();
      if (!user) throw new UnauthorizedError();
      const text = q.trim();
      if (text.length < 2)
        throw new ValidationError({ q: "Search needs at least 2 characters" });
      if (!Number.isInteger(limit) || limit < 1 || limit > SEARCH_MAX_LIMIT)
        throw new ValidationError({
          limit: `Limit must be between 1 and ${SEARCH_MAX_LIMIT}`,
        });
      const needle = text.toLowerCase();
      const data = await readAll();
      const isAdmin = user.roles.includes("admin");

      // Patients: admin all; doctor their own; clinic admin their clinics; both gives the union.
      let patientPool: Patient[] = [];
      if (isAdmin) patientPool = data.patients;
      else {
        const ids = new Set<string>();
        if (user.roles.includes("doctor") && user.provider) {
          for (const a of data.appointments)
            if (a.providerId === user.provider.id) ids.add(a.patientId);
        }
        if (user.roles.includes("clinicadmin")) {
          for (const a of data.appointments)
            if (user.clinicAdminOf.includes(clinicOf(data, a)))
              ids.add(a.patientId);
        }
        patientPool = data.patients.filter((p) => ids.has(p.id));
      }
      const byName = (a: { name: string }, b: { name: string }) =>
        a.name.localeCompare(b.name);

      const patients = patientPool
        .map((p) => ({
          id: p.id,
          name: `${p.firstName} ${p.lastName}`,
          subtitle: p.email,
        }))
        .filter(
          (hit) =>
            hit.name.toLowerCase().includes(needle) ||
            hit.subtitle.toLowerCase().includes(needle),
        )
        .sort(byName)
        .slice(0, limit);

      const providers = [...data.providers.values()]
        .filter((p) => isAdmin || p.verificationStatus === "VERIFIED")
        .map((p) => ({
          id: p.id,
          name: providerFullName(p),
          specialty: p.specialty,
          clinicName: data.clinics.get(p.clinicId)?.name ?? null,
        }))
        .filter(
          (hit) =>
            hit.name.toLowerCase().includes(needle) ||
            hit.specialty.toLowerCase().includes(needle),
        )
        .sort(byName)
        .slice(0, limit);

      const clinics = [...data.clinics.values()]
        .map((c) => ({ id: c.id, name: c.name, address: c.location }))
        .filter(
          (hit) =>
            hit.name.toLowerCase().includes(needle) ||
            (hit.address ?? "").toLowerCase().includes(needle),
        )
        .sort(byName)
        .slice(0, limit);

      return { patients, providers, clinics };
    },
  };
}
