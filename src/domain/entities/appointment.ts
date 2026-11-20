import type { FieldErrors } from "../errors";
import { isBlank, isValidDate } from "../validation";
import type { AppointmentSettings } from "./configuration";

export interface Appointment {
  id: string;
  patientId: string;
  providerId: string;
  /** ISO date-time string */
  appointmentDateTime: string;
  reasonForVisit: string;
}

export type AppointmentInput = Omit<Appointment, "id">;

export function validateAppointment(input: AppointmentInput): FieldErrors {
  const errors: FieldErrors = {};
  if (isBlank(input.patientId)) errors.patientId = "Patient is required";
  if (isBlank(input.providerId)) errors.providerId = "Provider is required";
  if (isBlank(input.appointmentDateTime))
    errors.appointmentDateTime = "Date & time is required";
  else if (!isValidDate(input.appointmentDateTime))
    errors.appointmentDateTime = "Invalid date";
  return errors;
}

const clockMinutes = (time: string) => {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(time);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours <= 23 && minutes <= 59 ? hours * 60 + minutes : null;
};

export function validateAppointmentSchedule(
  input: AppointmentInput,
  settings: AppointmentSettings,
  appointments: Appointment[],
  excludeAppointmentId?: string,
): FieldErrors {
  const errors = validateAppointment(input);
  if (errors.appointmentDateTime) return errors;

  const opening = clockMinutes(settings.clinicOpeningTime);
  const closing = clockMinutes(settings.clinicClosingTime);
  const dateTime = input.appointmentDateTime;
  const timeMatch = /T(\d{2}):(\d{2})/.exec(dateTime);
  const startMinutes = timeMatch
    ? Number(timeMatch[1]) * 60 + Number(timeMatch[2])
    : null;

  if (opening === null || closing === null || startMinutes === null) {
    errors.appointmentDateTime = "Appointment settings or time are invalid";
    return errors;
  }

  const endMinutes = startMinutes + settings.appointmentDurationMinutes;
  if (startMinutes < opening || endMinutes > closing) {
    errors.appointmentDateTime =
      `Appointment must fit within clinic hours ` +
      `${settings.clinicOpeningTime.slice(0, 5)}–${settings.clinicClosingTime.slice(0, 5)}`;
    return errors;
  }

  const start = Date.parse(dateTime);
  const end = start + settings.appointmentDurationMinutes * 60_000;
  const overlaps = appointments.some((appointment) => {
    if (
      appointment.id === excludeAppointmentId ||
      appointment.providerId !== input.providerId
    )
      return false;
    const existingStart = Date.parse(appointment.appointmentDateTime);
    const existingEnd =
      existingStart + settings.appointmentDurationMinutes * 60_000;
    return start < existingEnd && existingStart < end;
  });
  if (overlaps)
    errors.appointmentDateTime =
      "This provider already has an appointment at that time";

  return errors;
}
