import type { Appointment, Clinic, Patient, Provider } from "@/domain/entities";
import { patientFullName, providerFullName } from "@/domain/entities";
import type { AppointmentListItem } from "@/domain/repositories";

export interface AppointmentLookups {
  patients: Pick<Patient, "id" | "firstName" | "lastName">[];
  providers: Pick<
    Provider,
    "id" | "firstName" | "lastName" | "specialty" | "clinicId"
  >[];
  clinics: Pick<Clinic, "id" | "name">[];
}

/** Joins appointments with patient, provider and clinic names, as the list endpoints do. */
export function toAppointmentListItems(
  appointments: Appointment[],
  lookups: AppointmentLookups,
): AppointmentListItem[] {
  const patients = new Map(lookups.patients.map((item) => [item.id, item]));
  const providers = new Map(lookups.providers.map((item) => [item.id, item]));
  const clinics = new Map(lookups.clinics.map((item) => [item.id, item.name]));
  return appointments.map((appointment) => {
    const patient = patients.get(appointment.patientId);
    const provider = providers.get(appointment.providerId);
    const clinicId = provider?.clinicId ?? "";
    return {
      ...appointment,
      patientName: patient ? patientFullName(patient) : "",
      providerName: provider ? providerFullName(provider) : "",
      providerSpecialty: provider?.specialty ?? "",
      clinicId,
      clinicName: clinics.get(clinicId) ?? "",
    };
  });
}
