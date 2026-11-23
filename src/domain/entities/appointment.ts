import type { CurrentUser } from "../auth";
import type { FieldErrors } from "../errors";
import { isBlank, isValidDate } from "../validation";
import type { AppointmentSettings } from "./configuration";

export const APPOINTMENT_STATUSES = [
  "REQUESTED",
  "CONFIRMED",
  "DECLINED",
  "CANCELLED",
  "COMPLETED",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export interface Appointment {
  id: string;
  patientId: string;
  providerId: string;
  /** ISO date-time string */
  appointmentDateTime: string;
  reasonForVisit: string;
  /** Set by the API. New appointments start as REQUESTED. */
  status: AppointmentStatus;
}

/** Status is changed through the confirm, decline, complete and cancel actions, never by a form. */
export type AppointmentInput = Omit<Appointment, "id" | "status">;

export const APPOINTMENT_ACTIONS = [
  "confirm",
  "decline",
  "complete",
  "cancel",
] as const;
export type AppointmentAction = (typeof APPOINTMENT_ACTIONS)[number];

const ACTION_RULES: Record<
  AppointmentAction,
  { from: readonly AppointmentStatus[]; to: AppointmentStatus }
> = {
  confirm: { from: ["REQUESTED"], to: "CONFIRMED" },
  decline: { from: ["REQUESTED"], to: "DECLINED" },
  complete: { from: ["CONFIRMED"], to: "COMPLETED" },
  cancel: { from: ["REQUESTED", "CONFIRMED"], to: "CANCELLED" },
};

/** The status an action leads to from `status`, or null when the action is invalid there. */
export function nextAppointmentStatus(
  status: AppointmentStatus,
  action: AppointmentAction,
): AppointmentStatus | null {
  const rule = ACTION_RULES[action];
  return rule.from.includes(status) ? rule.to : null;
}

/**
 * Whether the user may take the action on this appointment, ignoring its status.
 * Confirm, decline and complete need the appointment's own verified doctor.
 * Cancel also allows the appointment's own patient.
 */
export function canActOnAppointment(
  appointment: Pick<Appointment, "patientId" | "providerId">,
  action: AppointmentAction,
  user: Pick<CurrentUser, "roles" | "patient" | "provider"> | null,
): boolean {
  if (!user) return false;
  const ownDoctor =
    user.roles.includes("doctor") &&
    user.provider?.id === appointment.providerId &&
    user.provider.verificationStatus === "VERIFIED";
  if (ownDoctor) return true;
  return (
    action === "cancel" &&
    user.roles.includes("patient") &&
    user.patient?.id === appointment.patientId
  );
}

/** The actions the user may take on the appointment right now: status and caller rules together. */
export function appointmentActionsFor(
  appointment: Pick<Appointment, "patientId" | "providerId" | "status">,
  user: Pick<CurrentUser, "roles" | "patient" | "provider"> | null,
): AppointmentAction[] {
  return APPOINTMENT_ACTIONS.filter(
    (action) =>
      nextAppointmentStatus(appointment.status, action) !== null &&
      canActOnAppointment(appointment, action, user),
  );
}

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
  appointments: Pick<
    Appointment,
    "id" | "providerId" | "appointmentDateTime"
  >[],
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
