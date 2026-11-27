import type { CurrentUser } from "@/domain/auth";
import type {
  AllergyType,
  Appointment,
  Clinic,
  Patient,
  PatientAllergy,
  Provider,
} from "@/domain/entities";
import { UnauthorizedError } from "@/domain/errors";
import type {
  AdminDashboard,
  AppointmentListItem,
  ClinicAdminDashboard,
  DashboardData,
  DashboardRepository,
  DoctorDashboard,
  MeDashboard,
  PatientDashboard,
} from "@/domain/repositories";
import { toAppointmentListItems } from "./mock-appointment-view";

type Listable<T> = {
  list(): Promise<T[]>;
};

const DAY_MS = 86_400_000;
const CANCELLED_OR_DECLINED = new Set(["DECLINED", "CANCELLED"]);

/** Derives dashboard totals and the next appointments from the mock stores. */
export function createMockDashboardRepository(
  repositories: {
    clinics: Listable<Clinic>;
    providers: Listable<Provider>;
    patients: Listable<Patient>;
    allergyTypes: Listable<AllergyType>;
    appointments: Listable<Appointment>;
    allergies: Listable<PatientAllergy>;
  },
  currentUser: () => Promise<CurrentUser | null>,
): DashboardRepository {
  const loadAll = async () => {
    const [
      clinics,
      providers,
      patients,
      allergyTypes,
      appointments,
      allergies,
    ] = await Promise.all([
      repositories.clinics.list(),
      repositories.providers.list(),
      repositories.patients.list(),
      repositories.allergyTypes.list(),
      repositories.appointments.list(),
      repositories.allergies.list(),
    ]);
    return {
      clinics,
      providers,
      patients,
      allergyTypes,
      appointments,
      allergies,
    };
  };

  return {
    async getDashboard(): Promise<DashboardData> {
      const {
        clinics,
        providers,
        patients,
        allergyTypes,
        appointments,
        allergies,
      } = await loadAll();
      const upcomingAppointments = toAppointmentListItems(appointments, {
        patients,
        providers,
        clinics,
        allergies,
      })
        .filter((item) => Date.parse(item.appointmentDateTime) >= Date.now())
        .sort((a, b) =>
          a.appointmentDateTime.localeCompare(b.appointmentDateTime),
        )
        .slice(0, 5);
      return {
        clinics: clinics.length,
        providers: providers.length,
        patients: patients.length,
        allergyTypes: allergyTypes.length,
        appointments: appointments.length,
        upcomingAppointments,
      };
    },

    async getMine(): Promise<MeDashboard> {
      const user = await currentUser();
      if (!user) throw new UnauthorizedError();
      const { clinics, providers, patients, appointments, allergies } =
        await loadAll();
      const items = toAppointmentListItems(appointments, {
        patients,
        providers,
        clinics,
        allergies,
      });

      // "Today" is the UTC calendar day; "week" is seven days from its midnight.
      const now = Date.now();
      const todayStart = (() => {
        const d = new Date(now);
        return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      })();
      const inToday = (item: AppointmentListItem) => {
        const t = Date.parse(item.appointmentDateTime);
        return t >= todayStart && t < todayStart + DAY_MS;
      };
      const inWeek = (item: AppointmentListItem) => {
        const t = Date.parse(item.appointmentDateTime);
        return t >= todayStart && t < todayStart + 7 * DAY_MS;
      };
      const counts = (item: AppointmentListItem) =>
        !CANCELLED_OR_DECLINED.has(item.status);
      const upcoming = (item: AppointmentListItem) =>
        (item.status === "REQUESTED" || item.status === "CONFIRMED") &&
        Date.parse(item.appointmentDateTime) >= now;
      const soonestFirst = (a: AppointmentListItem, b: AppointmentListItem) =>
        Date.parse(a.appointmentDateTime) - Date.parse(b.appointmentDateTime);

      const isAdmin = user.roles.includes("admin");
      const isClinicAdmin = user.roles.includes("clinicadmin");
      const isDoctor = user.roles.includes("doctor") && !!user.provider;
      const isPatient = user.roles.includes("patient") && !!user.patient;

      // Admin: the whole system.
      let admin: AdminDashboard | null = null;
      if (isAdmin)
        admin = {
          clinicCount: clinics.length,
          providerCount: providers.length,
          patientCount: patients.length,
          pendingProviderVerificationCount: providers.filter(
            (p) => p.verificationStatus === "PENDING",
          ).length,
          todayAppointmentCount: items.filter(
            (item) => counts(item) && inToday(item),
          ).length,
        };

      // Clinic admin: scoped to the caller's clinics. Patients are those with an appointment there.
      let clinicAdmin: ClinicAdminDashboard | null = null;
      if (isClinicAdmin) {
        const mine = new Set(user.clinicAdminOf);
        const myProviders = providers.filter((p) => mine.has(p.clinicId));
        const myProviderIds = new Set(myProviders.map((p) => p.id));
        const myItems = items.filter((item) =>
          myProviderIds.has(item.providerId),
        );
        clinicAdmin = {
          clinicCount: clinics.filter((c) => mine.has(c.id)).length,
          providerCount: myProviders.length,
          patientCount: new Set(myItems.map((item) => item.patientId)).size,
          pendingProviderVerificationCount: myProviders.filter(
            (p) => p.verificationStatus === "PENDING",
          ).length,
          todayAppointmentCount: myItems.filter(
            (item) => counts(item) && inToday(item),
          ).length,
        };
      }

      // Doctor: the caller's own appointments.
      let doctor: DoctorDashboard | null = null;
      if (isDoctor && user.provider) {
        const providerId = user.provider.id;
        const own = items.filter((item) => item.providerId === providerId);
        doctor = {
          todayAppointmentCount: own.filter(
            (item) => counts(item) && inToday(item),
          ).length,
          weekAppointmentCount: own.filter(
            (item) => counts(item) && inWeek(item),
          ).length,
          distinctPatientCount: new Set(own.map((item) => item.patientId)).size,
          nextAppointment: own.filter(upcoming).sort(soonestFirst)[0] ?? null,
          pendingRequestCount: own.filter(
            (item) =>
              item.status === "REQUESTED" &&
              Date.parse(item.appointmentDateTime) >= now,
          ).length,
        };
      }

      // Patient: the caller's own appointments.
      let patient: PatientDashboard | null = null;
      if (isPatient && user.patient) {
        const patientId = user.patient.id;
        const mine = items.filter(
          (item) => item.patientId === patientId && upcoming(item),
        );
        // Recent decisions use the current status, so a later completion or cancellation drops out.
        const recentDecisions = items
          .filter(
            (item) =>
              item.patientId === patientId &&
              (item.status === "CONFIRMED" || item.status === "DECLINED"),
          )
          .sort(
            (a, b) =>
              Date.parse(b.statusChangedAtUtc ?? b.appointmentDateTime) -
              Date.parse(a.statusChangedAtUtc ?? a.appointmentDateTime),
          )
          .slice(0, 5)
          .map((item) => ({
            appointmentId: item.id,
            status: item.status as "CONFIRMED" | "DECLINED",
            decidedAtUtc: item.statusChangedAtUtc ?? null,
            providerName: item.providerName,
          }));
        patient = {
          nextAppointment: mine.sort(soonestFirst)[0] ?? null,
          upcomingAppointmentCount: mine.length,
          recentDecisions,
        };
      }

      return { admin, clinicAdmin, doctor, patient };
    },
  };
}
