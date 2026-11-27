import type {
  AppointmentListItem,
  PatientListItem,
  PatientRow,
} from "./schemas";

export type PatientVisits = {
  latestVisit?: AppointmentListItem;
  lastVisit?: AppointmentListItem;
  nextVisit?: AppointmentListItem;
};

export const patientFullName = (patient: {
  firstName: string;
  lastName: string;
}) => `${patient.firstName} ${patient.lastName}`.trim();

const timeOf = (appointment: AppointmentListItem) =>
  Date.parse(appointment.appointmentDateTime);

export function summarizeVisits(
  appointments: AppointmentListItem[],
  now: number,
): PatientVisits {
  const sorted = [...appointments].sort((a, b) => timeOf(a) - timeOf(b));
  const past = sorted.filter((a) => timeOf(a) < now);
  return {
    latestVisit: sorted[sorted.length - 1],
    lastVisit: past[past.length - 1],
    nextVisit: sorted.find((a) => timeOf(a) >= now),
  };
}

export function groupVisitsByPatient(
  appointments: AppointmentListItem[],
  patientIds: string[],
  now: number,
): Map<string, PatientVisits> {
  const wanted = new Set(patientIds);
  const byPatient = new Map<string, AppointmentListItem[]>();
  for (const appointment of appointments) {
    if (!wanted.has(appointment.patientId)) continue;
    const list = byPatient.get(appointment.patientId) ?? [];
    list.push(appointment);
    byPatient.set(appointment.patientId, list);
  }
  return new Map(
    [...byPatient].map(([patientId, list]) => [
      patientId,
      summarizeVisits(list, now),
    ]),
  );
}

export function toPatientRow(
  patient: PatientListItem,
  visits?: PatientVisits,
): PatientRow {
  const latest = visits?.latestVisit;
  return {
    patient,
    lastVisit: visits?.lastVisit,
    nextVisit: visits?.nextVisit,
    latestVisit: latest,
    provider: latest
      ? {
          id: latest.providerId,
          name: latest.providerName,
          specialty: latest.providerSpecialty,
        }
      : undefined,
  };
}
