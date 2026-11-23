import type { CurrentUser } from "../auth";
import type { FieldErrors } from "../errors";
import { isBlank, isValidDate } from "../validation";
import {
  type AppointmentSettings,
  clockToMinutes,
  isWithinClinicHours,
} from "./configuration";

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

/**
 * Whether a visit starting at `dateTime` clashes with any busy start. Two visits
 * clash when they start less than one duration apart; back-to-back is fine.
 */
export function overlapsBusyStart(
  dateTime: string,
  durationMinutes: number,
  busyStarts: readonly string[],
): boolean {
  const durationMs = durationMinutes * 60_000;
  const start = Date.parse(dateTime);
  return busyStarts.some((busy) => {
    const existing = Date.parse(busy);
    return start < existing + durationMs && existing < start + durationMs;
  });
}

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

  const dateTime = input.appointmentDateTime;
  const timeMatch = /T(\d{2}):(\d{2})/.exec(dateTime);
  if (
    !timeMatch ||
    clockToMinutes(settings.clinicOpeningTime) === null ||
    clockToMinutes(settings.clinicClosingTime) === null
  ) {
    errors.appointmentDateTime = "Appointment settings or time are invalid";
    return errors;
  }
  const startMinutes = Number(timeMatch[1]) * 60 + Number(timeMatch[2]);
  if (
    !isWithinClinicHours(
      startMinutes,
      settings.appointmentDurationMinutes,
      settings,
    )
  ) {
    errors.appointmentDateTime =
      `Appointment must fit within clinic hours ` +
      `${settings.clinicOpeningTime.slice(0, 5)}–${settings.clinicClosingTime.slice(0, 5)}`;
    return errors;
  }

  const busyStarts = appointments
    .filter(
      (appointment) =>
        appointment.id !== excludeAppointmentId &&
        appointment.providerId === input.providerId,
    )
    .map((appointment) => appointment.appointmentDateTime);
  if (
    overlapsBusyStart(dateTime, settings.appointmentDurationMinutes, busyStarts)
  )
    errors.appointmentDateTime =
      "This provider already has an appointment at that time";

  return errors;
}
