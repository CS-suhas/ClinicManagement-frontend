import { hasRole } from "@/application/auth/permissions";
import type { CurrentUser } from "@/domain/auth";
import {
  type Appointment,
  type AppointmentAction,
  type AppointmentInput,
  appointmentActionsFor,
  validateAppointment,
} from "@/domain/entities";
import type {
  AppointmentListItem,
  AppointmentRepository,
  AppointmentSearchOptions,
} from "@/domain/repositories";
import { CrudService } from "./crud-service";

const PAGE_SIZE = 100;
/** Caps the paging loop so a runaway backend cannot stall the page. */
const MAX_PAGES = 20;

export interface AppointmentDayQuery {
  /** Local calendar day, "YYYY-MM-DD". */
  date: string;
  /** Only these providers. An empty array matches nothing. */
  providerIds?: string[];
  patientId?: string;
  clinicId?: string;
}

/**
 * What the signed-in user may see on the appointments page. Mirrors the
 * backend's search scoping: admin, then patient, then clinic admin, then doctor.
 */
export type AppointmentScope =
  | { mode: "all"; canWrite: boolean }
  /** Read-only. `clinicId` is the default clinic; `clinicIds` lets the UI offer a picker. */
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

/** Only admins create, edit and delete appointments. */
export const canManageAppointments = (scope: AppointmentScope) =>
  scope.mode === "all" && scope.canWrite;

/** The day query that limits a day's appointments to what the scope allows. */
export function appointmentDayQuery(
  scope: AppointmentScope,
  date: string,
): AppointmentDayQuery {
  switch (scope.mode) {
    case "all":
      return { date };
    case "clinic":
      return { date, clinicId: scope.clinicId };
    case "provider":
      return { date, providerIds: [scope.providerId] };
    case "patient":
      return { date, patientId: scope.patientId };
    case "none":
      return { date, providerIds: [] };
  }
}

/** The actions the user may take on an appointment, for showing only valid buttons. */
export function allowedActions(
  item: Pick<AppointmentListItem, "patientId" | "providerId" | "status">,
  user: Pick<CurrentUser, "roles" | "patient" | "provider"> | null,
): AppointmentAction[] {
  return appointmentActionsFor(item, user);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Shifts a "YYYY-MM-DD" local day by whole days. */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(year, month - 1, day + days);
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
}

/** Local midnight at the start of a "YYYY-MM-DD" day, with the local UTC offset, e.g. 2026-11-23T00:00:00+05:30. */
export function localMidnightIso(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const offsetMinutes = -new Date(year, month - 1, day).getTimezoneOffset();
  const sign = offsetMinutes < 0 ? "-" : "+";
  const abs = Math.abs(offsetMinutes);
  return `${date}T00:00:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

export class AppointmentService extends CrudService<
  Appointment,
  AppointmentInput,
  AppointmentSearchOptions,
  AppointmentListItem
> {
  constructor(private readonly appointments: AppointmentRepository) {
    super(appointments, "Appointment");
  }
  protected validate = validateAppointment;

  /**
   * Every appointment on a local day, soonest first. The provider filter runs
   * on the server; the day runs from local midnight to the next local midnight.
   */
  async listForDay({
    date,
    providerIds,
    patientId,
    clinicId,
  }: AppointmentDayQuery): Promise<AppointmentListItem[]> {
    if (providerIds?.length === 0) return [];
    const from = localMidnightIso(date);
    const to = localMidnightIso(addDays(date, 1));

    const found: AppointmentListItem[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const result = await this.search({
        from,
        to,
        providerIds,
        patientId,
        clinicId,
        page,
        pageSize: PAGE_SIZE,
      });
      found.push(...result.items);
      if (result.items.length < PAGE_SIZE || found.length >= result.totalCount)
        break;
    }

    return found.sort(
      (a, b) =>
        Date.parse(a.appointmentDateTime) - Date.parse(b.appointmentDateTime),
    );
  }

  confirm(id: string): Promise<void> {
    return this.appointments.confirm(id);
  }

  decline(id: string): Promise<void> {
    return this.appointments.decline(id);
  }

  complete(id: string): Promise<void> {
    return this.appointments.complete(id);
  }

  cancel(id: string): Promise<void> {
    return this.appointments.cancel(id);
  }
}
