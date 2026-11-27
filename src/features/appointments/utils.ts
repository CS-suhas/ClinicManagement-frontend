import { hasRole } from "@/features/auth/permissions";
import type { CurrentUser } from "@/features/auth/schemas";
import {
  AppointmentAction,
  type AppointmentListItem,
  type AppointmentSettings,
  type AppointmentStatus,
} from "./schemas";

export function clockToMinutes(time: string): number | null {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(time);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours <= 23 && minutes <= 59 ? hours * 60 + minutes : null;
}

export function minutesToClock(minutes: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export function isWithinClinicHours(
  startMinutes: number,
  settings: AppointmentSettings,
  durationMinutes = settings.appointmentDurationMinutes,
): boolean {
  const opening = clockToMinutes(settings.clinicOpeningTime);
  const closing = clockToMinutes(settings.clinicClosingTime);
  if (opening === null || closing === null) return false;
  return startMinutes >= opening && startMinutes + durationMinutes <= closing;
}

export function appointmentTimeBounds(
  settings: AppointmentSettings | undefined,
) {
  if (!settings) return { opening: undefined, latestStart: undefined };
  const opening = clockToMinutes(settings.clinicOpeningTime);
  const closing = clockToMinutes(settings.clinicClosingTime);
  const latest =
    closing === null ? null : closing - settings.appointmentDurationMinutes;
  return {
    opening: opening === null ? undefined : minutesToClock(opening),
    latestStart:
      latest !== null && latest >= 0 ? minutesToClock(latest) : undefined,
  };
}

const ACTION_RULES: Record<
  AppointmentAction,
  { from: readonly AppointmentStatus[]; to: AppointmentStatus }
> = {
  confirm: { from: ["REQUESTED"], to: "CONFIRMED" },
  decline: { from: ["REQUESTED"], to: "DECLINED" },
  complete: { from: ["CONFIRMED"], to: "COMPLETED" },
  cancel: { from: ["REQUESTED", "CONFIRMED"], to: "CANCELLED" },
};

export function nextAppointmentStatus(
  status: AppointmentStatus,
  action: AppointmentAction,
): AppointmentStatus | null {
  const rule = ACTION_RULES[action];
  return rule.from.includes(status) ? rule.to : null;
}

type ActingUser = Pick<CurrentUser, "roles" | "patient" | "provider">;
type ActionTarget = Pick<AppointmentListItem, "patientId" | "providerId">;

export function canActOnAppointment(
  appointment: ActionTarget,
  action: AppointmentAction,
  user: ActingUser | null,
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

export function appointmentActionsFor(
  appointment: ActionTarget & Pick<AppointmentListItem, "status">,
  user: ActingUser | null,
): AppointmentAction[] {
  return AppointmentAction.options.filter(
    (action) =>
      nextAppointmentStatus(appointment.status, action) !== null &&
      canActOnAppointment(appointment, action, user),
  );
}

export type AppointmentScope =
  | { mode: "all"; canWrite: boolean }
  | { mode: "clinic"; clinicId: string; clinicIds: string[] }
  | { mode: "provider"; providerId: string }
  | { mode: "patient"; patientId: string }
  | { mode: "none" };

export function appointmentScopeFor(
  user: Pick<
    CurrentUser,
    "roles" | "patient" | "provider" | "clinicAdminOf"
  > | null,
): AppointmentScope {
  if (!user) return { mode: "none" };
  if (hasRole(user, "admin")) return { mode: "all", canWrite: true };
  if (hasRole(user, "patient") && user.patient)
    return { mode: "patient", patientId: user.patient.id };
  if (hasRole(user, "clinicadmin")) {
    const [clinicId] = user.clinicAdminOf;
    return clinicId
      ? { mode: "clinic", clinicId, clinicIds: user.clinicAdminOf }
      : { mode: "none" };
  }
  if (hasRole(user, "doctor") && user.provider)
    return { mode: "provider", providerId: user.provider.id };
  return { mode: "none" };
}

export const canManageAppointments = (scope: AppointmentScope) =>
  scope.mode === "all" && scope.canWrite;

export function scopeFilter(scope: AppointmentScope) {
  switch (scope.mode) {
    case "all":
      return {};
    case "clinic":
      return { clinicId: scope.clinicId };
    case "provider":
      return { providerId: scope.providerId };
    case "patient":
      return { patientId: scope.patientId };
    case "none":
      return null;
  }
}

export const fullName = (person: { firstName: string; lastName: string }) =>
  `${person.firstName} ${person.lastName}`.trim();
