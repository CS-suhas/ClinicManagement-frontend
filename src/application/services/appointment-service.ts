import { hasRole } from "@/application/auth/permissions";
import type { CurrentUser } from "@/domain/auth";
import {
  type Appointment,
  type AppointmentInput,
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
}

/**
 * What the signed-in user may see on the appointments page. Mirrors the
 * backend: a patient is scoped as a patient even when also a doctor.
 */
export type AppointmentScope =
  | { mode: "all"; canWrite: boolean }
  | { mode: "provider"; providerId: string }
  | { mode: "patient"; patientId: string }
  | { mode: "none" };

export function appointmentScopeFor(
  user: Pick<CurrentUser, "roles" | "patient" | "provider"> | null,
): AppointmentScope {
  if (!user) return { mode: "none" };
  if (hasRole(user, "patient") && user.patient)
    return { mode: "patient", patientId: user.patient.id };
  if (hasRole(user, "admin", "clinicadmin"))
    return { mode: "all", canWrite: hasRole(user, "admin") };
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
    case "provider":
      return { date, providerIds: [scope.providerId] };
    case "patient":
      return { date, patientId: scope.patientId };
    case "none":
      return { date, providerIds: [] };
  }
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Shifts a "YYYY-MM-DD" local day by whole days. */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(year, month - 1, day + days);
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
}

export class AppointmentService extends CrudService<
  Appointment,
  AppointmentInput,
  AppointmentSearchOptions,
  AppointmentListItem
> {
  constructor(appointmentRepo: AppointmentRepository) {
    super(appointmentRepo, "Appointment");
  }
  protected validate = validateAppointment;

  /**
   * Every appointment on a local day, soonest first. Pages through the
   * search port. Local times are sent without an offset, matching how
   * appointments are stored.
   */
  async listForDay({
    date,
    providerIds,
    patientId,
  }: AppointmentDayQuery): Promise<AppointmentListItem[]> {
    if (providerIds?.length === 0) return [];
    const from = `${date}T00:00:00`;
    const to = `${addDays(date, 1)}T00:00:00`;
    const providerId = providerIds?.length === 1 ? providerIds[0] : undefined;

    const found: AppointmentListItem[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const result = await this.search({
        from,
        to,
        patientId,
        providerId,
        page,
        pageSize: PAGE_SIZE,
      });
      found.push(...result.items);
      if (result.items.length < PAGE_SIZE || found.length >= result.totalCount)
        break;
    }

    const allowed = providerIds ? new Set(providerIds) : null;
    return found
      .filter((item) => !allowed || allowed.has(item.providerId))
      .sort(
        (a, b) =>
          Date.parse(a.appointmentDateTime) - Date.parse(b.appointmentDateTime),
      );
  }
}
