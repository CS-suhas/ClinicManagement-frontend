import type { CurrentUser } from "@/domain/auth";
import type { Appointment, PatientListItem, Provider } from "@/domain/entities";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "@/domain/errors";
import type {
  PatientRosterRow,
  PatientVisitSummary,
  ProviderRosterRepository,
  SearchOptions,
} from "@/domain/repositories";
import { delay } from "./local-storage-collection";

interface Listable<T> {
  list(): Promise<T[]>;
}

const summary = (appointment: Appointment): PatientVisitSummary => ({
  id: appointment.id,
  appointmentDateTime: appointment.appointmentDateTime,
  reasonForVisit: appointment.reasonForVisit,
});

/**
 * Mock provider roster. Enforces the API's access rule: the doctor themself,
 * an admin, or a clinic admin of the doctor's clinic.
 */
export function createMockProviderRosterRepository(
  repositories: {
    patients: Listable<PatientListItem>;
    providers: Listable<Provider>;
    appointments: Listable<Appointment>;
  },
  currentUser: () => Promise<CurrentUser | null>,
): ProviderRosterRepository {
  return {
    async searchProviderRoster(providerId: string, options: SearchOptions) {
      await delay();
      const user = await currentUser();
      if (!user) throw new UnauthorizedError();
      const [patients, providers, appointments] = await Promise.all([
        repositories.patients.list(),
        repositories.providers.list(),
        repositories.appointments.list(),
      ]);
      const provider = providers.find((item) => item.id === providerId);
      if (!provider) throw new NotFoundError("Provider", providerId);

      const isSelf =
        user.roles.includes("doctor") && user.provider?.id === providerId;
      const isClinicAdmin =
        user.roles.includes("clinicadmin") &&
        !!provider.clinicId &&
        user.clinicAdminOf.includes(provider.clinicId);
      if (!(user.roles.includes("admin") || isSelf || isClinicAdmin))
        throw new ForbiddenError();

      const now = Date.now();
      const patientById = new Map(patients.map((item) => [item.id, item]));
      const byPatient = new Map<string, Appointment[]>();
      for (const appointment of appointments) {
        if (appointment.providerId !== providerId) continue;
        const list = byPatient.get(appointment.patientId) ?? [];
        list.push(appointment);
        byPatient.set(appointment.patientId, list);
      }

      const rows: PatientRosterRow[] = [];
      for (const [patientId, list] of byPatient) {
        const patient = patientById.get(patientId);
        if (!patient) continue;
        // Visit facts ignore DECLINED and CANCELLED; the count does not.
        const counted = list
          .filter((a) => a.status !== "DECLINED" && a.status !== "CANCELLED")
          .sort(
            (a, b) =>
              Date.parse(a.appointmentDateTime) -
              Date.parse(b.appointmentDateTime),
          );
        const past = counted.filter(
          (a) => Date.parse(a.appointmentDateTime) < now,
        );
        const future = counted.filter(
          (a) => Date.parse(a.appointmentDateTime) >= now,
        );
        rows.push({
          patient,
          lastVisit: past.length > 0 ? summary(past[past.length - 1]) : null,
          nextVisit: future.length > 0 ? summary(future[0]) : null,
          appointmentCount: list.length,
        });
      }

      const needle = options.search?.trim().toLowerCase();
      const matching = rows
        .filter(
          ({ patient }) =>
            !needle ||
            [
              patient.firstName,
              patient.lastName,
              `${patient.firstName} ${patient.lastName}`,
            ].some((value) => value.toLowerCase().includes(needle)),
        )
        .sort(
          (a, b) =>
            a.patient.lastName.localeCompare(b.patient.lastName) ||
            a.patient.firstName.localeCompare(b.patient.firstName),
        );
      const start = (options.page - 1) * options.pageSize;
      return {
        items: matching.slice(start, start + options.pageSize),
        totalCount: matching.length,
        page: options.page,
        pageSize: options.pageSize,
      };
    },
  };
}
