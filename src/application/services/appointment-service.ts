import type { CurrentUser } from "@/domain/auth";
import {
  type Appointment,
  type AppointmentAction,
  type AppointmentInput,
  appointmentActionsFor,
  validateAppointment,
} from "@/domain/entities";
import {
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from "@/domain/errors";
import {
  addDays,
  localMidnightIso,
  toOffsetDateTime,
} from "@/domain/local-time";
import type {
  AppointmentAvailabilityRepository,
  AppointmentListItem,
  AppointmentRepository,
  AppointmentSearchOptions,
} from "@/domain/repositories";
import { hasRole } from "@/features/auth/permissions";
import { CrudService } from "./crud-service";

export { addDays, localMidnightIso };

const PAGE_SIZE = 100;
const MAX_PAGES = 20;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type AppointmentDayQuery = {
  date: string;
  providerIds?: string[];
  patientId?: string;
  clinicId?: string;
};

export type PatientBookingInput = {
  providerId: string;
  appointmentDateTime: string;
  reasonForVisit: string;
};

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

export function allowedActions(
  item: Pick<AppointmentListItem, "patientId" | "providerId" | "status">,
  user: Pick<CurrentUser, "roles" | "patient" | "provider"> | null,
): AppointmentAction[] {
  return appointmentActionsFor(item, user);
}

export class AppointmentService extends CrudService<
  Appointment,
  AppointmentInput,
  AppointmentSearchOptions,
  AppointmentListItem
> {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly availability: AppointmentAvailabilityRepository,
  ) {
    super(appointments, "Appointment");
  }
  protected validate = validateAppointment;

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

  busyStarts(providerId: string, date: string): Promise<string[]> {
    if (!DATE_PATTERN.test(date))
      throw new ValidationError({ date: "Date must be YYYY-MM-DD" });
    return this.availability.getBusyStarts(providerId, date);
  }

  bookAsPatient(
    input: PatientBookingInput,
    user: Pick<CurrentUser, "roles" | "patient"> | null,
  ): Promise<Appointment> {
    if (!user) throw new UnauthorizedError();
    if (!hasRole(user, "patient") || !user.patient)
      throw new ForbiddenError("Only patients with a patient record can book.");
    return this.create({
      patientId: user.patient.id,
      providerId: input.providerId,
      appointmentDateTime: toOffsetDateTime(input.appointmentDateTime),
      reasonForVisit: input.reasonForVisit.trim(),
    });
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
