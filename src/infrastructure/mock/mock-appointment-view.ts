import type {
  Appointment,
  Clinic,
  Patient,
  PatientAllergy,
  Provider,
} from "@/domain/entities";
import {
  highestSeverity,
  patientFullName,
  providerFullName,
} from "@/domain/entities";
import type { AppointmentListItem } from "@/domain/repositories";

export type AppointmentLookups = {
  patients: Pick<Patient, "id" | "firstName" | "lastName">[];
  providers: Pick<
    Provider,
    "id" | "firstName" | "lastName" | "specialty" | "clinicId"
  >[];
  clinics: Pick<Clinic, "id" | "name">[];
  allergies?: Pick<PatientAllergy, "patientId" | "severity">[];
};

export function toAppointmentListItems(
  appointments: Appointment[],
  lookups: AppointmentLookups,
): AppointmentListItem[] {
  const patients = new Map(lookups.patients.map((item) => [item.id, item]));
  const providers = new Map(lookups.providers.map((item) => [item.id, item]));
  const clinics = new Map(lookups.clinics.map((item) => [item.id, item.name]));
  const severitiesByPatient = new Map<string, string[]>();
  for (const record of lookups.allergies ?? []) {
    const list = severitiesByPatient.get(record.patientId) ?? [];
    list.push(record.severity);
    severitiesByPatient.set(record.patientId, list);
  }
  return appointments.map((appointment) => {
    const patient = patients.get(appointment.patientId);
    const provider = providers.get(appointment.providerId);
    const clinicId = provider?.clinicId ?? "";
    const allergySeverities = severitiesByPatient.get(appointment.patientId);
    return {
      ...appointment,
      createdAtUtc: appointment.createdAtUtc ?? null,
      statusChangedAtUtc:
        appointment.statusChangedAtUtc ?? appointment.createdAtUtc ?? null,
      patientName: patient ? patientFullName(patient) : "",
      providerName: provider ? providerFullName(provider) : "",
      providerSpecialty: provider?.specialty ?? "",
      clinicId,
      clinicName: clinics.get(clinicId) ?? "",
      ...(lookups.allergies
        ? {
            patientAllergyCount: allergySeverities?.length ?? 0,
            patientHighestAllergySeverity: highestSeverity(
              allergySeverities ?? [],
            ),
          }
        : {}),
    };
  });
}
