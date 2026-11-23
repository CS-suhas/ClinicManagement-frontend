import type { CurrentUser, Role } from "@/domain/auth";
import {
  type Appointment,
  type AppointmentAction,
  type AppointmentInput,
  canActOnAppointment,
  nextAppointmentStatus,
  overlapsBusyStart,
} from "@/domain/entities";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/domain/errors";
import type {
  AppointmentListItem,
  AppointmentRepository,
  AppointmentSearchOptions,
  PagedResult,
} from "@/domain/repositories";
import { delay, type LocalStorageCollection } from "./local-storage-collection";
import {
  type AppointmentLookups,
  toAppointmentListItems,
} from "./mock-appointment-view";
import { MockCrudRepository, newId } from "./mock-repositories";

const MAX_PROVIDER_IDS = 100;

/**
 * Narrows a search to what the caller may see, mirroring the API. Checks run
 * in the API's order: admin, patient, clinic admin, doctor.
 */
export function scopeAppointmentSearch(
  user: CurrentUser | null,
  options: AppointmentSearchOptions,
): AppointmentSearchOptions {
  if (!user) throw new UnauthorizedError();
  const has = (role: Role) => user.roles.includes(role);
  if (has("admin")) return options;
  if (has("patient") && user.patient)
    return { ...options, patientId: user.patient.id };
  if (has("clinicadmin")) {
    if (!options.clinicId || !user.clinicAdminOf.includes(options.clinicId))
      throw new ForbiddenError("Choose one of your clinics.");
    return options;
  }
  if (has("doctor") && user.provider) {
    const own = user.provider.id;
    const othersRequested =
      (options.providerId !== undefined && options.providerId !== own) ||
      (options.providerIds?.some((id) => id !== own) ?? false);
    if (othersRequested)
      throw new ForbiddenError("Doctors can only see their own appointments.");
    return { ...options, providerId: own };
  }
  throw new ForbiddenError();
}

/**
 * Mock appointments. Enforces the API's search scoping, status transitions and
 * caller rules, reading the caller from `currentUser`.
 */
export class MockAppointmentRepository implements AppointmentRepository {
  private readonly crud: MockCrudRepository<Appointment, AppointmentInput>;

  constructor(
    private readonly store: LocalStorageCollection<Appointment>,
    private readonly getLookups: () => Promise<AppointmentLookups>,
    private readonly currentUser: () => Promise<CurrentUser | null>,
    /** The clinic's visit length, for the overlap rule. */
    private readonly appointmentDurationMinutes: number,
  ) {
    this.crud = new MockCrudRepository(store, "Appointment");
  }

  list() {
    return this.crud.list();
  }

  getById(id: string) {
    return this.crud.getById(id);
  }

  /**
   * New appointments start as REQUESTED, as the API does. Throws NotFoundError
   * for an unknown provider and ConflictError when the provider has a REQUESTED
   * or CONFIRMED appointment less than one duration away.
   */
  async create(input: AppointmentInput, id: string = newId()) {
    await delay();
    const lookups = await this.getLookups();
    if (!lookups.providers.some((provider) => provider.id === input.providerId))
      throw new NotFoundError("Provider", input.providerId);
    const items = this.store.read();
    const busyStarts = items
      .filter(
        (appointment) =>
          appointment.providerId === input.providerId &&
          (appointment.status === "REQUESTED" ||
            appointment.status === "CONFIRMED"),
      )
      .map((appointment) => appointment.appointmentDateTime);
    if (
      overlapsBusyStart(
        input.appointmentDateTime,
        this.appointmentDurationMinutes,
        busyStarts,
      )
    )
      throw new ConflictError("That time was just taken.");
    const item: Appointment = { ...input, id, status: "REQUESTED" };
    this.store.write([...items, item]);
    return item;
  }

  update(id: string, input: AppointmentInput) {
    return this.crud.update(id, input);
  }

  delete(id: string) {
    return this.crud.delete(id);
  }

  async search(
    options: AppointmentSearchOptions,
  ): Promise<PagedResult<AppointmentListItem>> {
    if (
      options.from &&
      options.to &&
      Date.parse(options.from) >= Date.parse(options.to)
    )
      throw new ValidationError({ from: "From must be before To" });
    if (options.providerIds && options.providerIds.length > MAX_PROVIDER_IDS)
      throw new ValidationError({
        providerIds: `At most ${MAX_PROVIDER_IDS} providers can be searched at once`,
      });

    const scoped = scopeAppointmentSearch(await this.currentUser(), options);
    const [appointments, lookups] = await Promise.all([
      this.crud.list(),
      this.getLookups(),
    ]);
    const search = scoped.search?.trim().toLowerCase();
    const filtered = toAppointmentListItems(appointments, lookups)
      .filter((item) => {
        if (scoped.providerId && item.providerId !== scoped.providerId)
          return false;
        if (scoped.providerIds && !scoped.providerIds.includes(item.providerId))
          return false;
        if (scoped.patientId && item.patientId !== scoped.patientId)
          return false;
        if (scoped.clinicId && item.clinicId !== scoped.clinicId) return false;
        if (scoped.status && item.status !== scoped.status) return false;
        // Compare instants, not text: public bookings carry an offset, admin entries do not.
        const time = Date.parse(item.appointmentDateTime);
        if (scoped.from && time < Date.parse(scoped.from)) return false;
        if (scoped.to && time >= Date.parse(scoped.to)) return false;
        return (
          !search ||
          [
            item.patientName,
            item.providerName,
            item.providerSpecialty,
            item.clinicName,
            item.reasonForVisit ?? "",
          ].some((value) => value.toLowerCase().includes(search))
        );
      })
      .sort(
        (a, b) =>
          Date.parse(a.appointmentDateTime) - Date.parse(b.appointmentDateTime),
      );
    const start = (options.page - 1) * options.pageSize;
    return {
      items: filtered.slice(start, start + options.pageSize),
      totalCount: filtered.length,
      page: options.page,
      pageSize: options.pageSize,
    };
  }

  confirm(id: string) {
    return this.transition(id, "confirm");
  }

  decline(id: string) {
    return this.transition(id, "decline");
  }

  complete(id: string) {
    return this.transition(id, "complete");
  }

  cancel(id: string) {
    return this.transition(id, "cancel");
  }

  /** Order of checks, as the API: not found (404), caller (403), then status (409). */
  private async transition(
    id: string,
    action: AppointmentAction,
  ): Promise<void> {
    await delay();
    const items = this.store.read();
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) throw new NotFoundError("Appointment", id);
    const appointment = items[index];
    const user = await this.currentUser();
    if (!user) throw new UnauthorizedError();
    if (!canActOnAppointment(appointment, action, user))
      throw new ForbiddenError();
    const status = nextAppointmentStatus(appointment.status, action);
    if (!status)
      throw new ConflictError(
        `Cannot ${action} an appointment that is ${appointment.status.toLowerCase()}.`,
      );
    items[index] = { ...appointment, status };
    this.store.write(items);
  }
}
