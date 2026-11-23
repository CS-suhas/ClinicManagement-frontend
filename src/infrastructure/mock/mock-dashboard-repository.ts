import {
  type AllergyType,
  type Appointment,
  type Clinic,
  type Patient,
  type Provider,
  patientFullName,
  providerFullName,
} from "@/domain/entities";
import type { DashboardData, DashboardRepository } from "@/domain/repositories";

interface Listable<T> {
  list(): Promise<T[]>;
}

/** Derives dashboard totals and the next appointments from the mock stores. */
export function createMockDashboardRepository(repositories: {
  clinics: Listable<Clinic>;
  providers: Listable<Provider>;
  patients: Listable<Patient>;
  allergyTypes: Listable<AllergyType>;
  appointments: Listable<Appointment>;
}): DashboardRepository {
  return {
    async getDashboard(): Promise<DashboardData> {
      const [clinics, providers, patients, allergyTypes, appointments] =
        await Promise.all([
          repositories.clinics.list(),
          repositories.providers.list(),
          repositories.patients.list(),
          repositories.allergyTypes.list(),
          repositories.appointments.list(),
        ]);
      const patientById = new Map(patients.map((item) => [item.id, item]));
      const providerById = new Map(providers.map((item) => [item.id, item]));
      const clinicById = new Map(clinics.map((item) => [item.id, item]));
      const upcomingAppointments = appointments
        .filter((item) => Date.parse(item.appointmentDateTime) >= Date.now())
        .sort((a, b) =>
          a.appointmentDateTime.localeCompare(b.appointmentDateTime),
        )
        .slice(0, 5)
        .map((item) => {
          const provider = providerById.get(item.providerId);
          const patient = patientById.get(item.patientId);
          const clinic = provider ? clinicById.get(provider.clinicId) : null;
          return {
            ...item,
            patientName: patient ? patientFullName(patient) : "",
            providerName: provider ? providerFullName(provider) : "",
            providerSpecialty: provider?.specialty ?? "",
            clinicId: provider?.clinicId ?? "",
            clinicName: clinic?.name ?? "",
          };
        });
      return {
        clinics: clinics.length,
        providers: providers.length,
        patients: patients.length,
        allergyTypes: allergyTypes.length,
        appointments: appointments.length,
        upcomingAppointments,
      };
    },
  };
}
