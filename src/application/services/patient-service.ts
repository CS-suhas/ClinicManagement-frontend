import {
  type Appointment,
  type Patient,
  type PatientInput,
  type PatientListItem,
  validatePatient,
} from "@/domain/entities";
import { assertNoDependents } from "@/domain/errors";
import type {
  AppointmentListItem,
  AppointmentRepository,
  PagedResult,
  PatientAllergyRepository,
  PatientRepository,
  PatientRosterRow,
  ProviderRosterRepository,
  SearchOptions,
} from "@/domain/repositories";
import { CrudService } from "./crud-service";

export type { PatientRosterRow } from "@/domain/repositories";

/** The provider behind a patient's latest appointment, as the appointment list reports it. */
export interface RosterProvider {
  id: string;
  name: string;
  specialty: string;
}

/** Visit facts for one patient, relative to a point in time. */
export interface PatientVisits {
  /** Most recent appointment on the books, past or upcoming. */
  latestVisit?: AppointmentListItem;
  /** Most recent appointment before `now`. */
  lastVisit?: AppointmentListItem;
  /** Soonest appointment at or after `now`. */
  nextVisit?: AppointmentListItem;
}

/** One line of the admin patients page, with visits across every provider. */
export interface PatientVisitRow {
  patient: PatientListItem;
  lastVisit?: AppointmentListItem;
  nextVisit?: AppointmentListItem;
  /** Most recent appointment on the books; supplies the reason and provider. */
  latestVisit?: AppointmentListItem;
  provider?: RosterProvider;
}

const APPOINTMENT_PAGE_SIZE = 200;

const timeOf = (appointment: Pick<Appointment, "appointmentDateTime">) =>
  Date.parse(appointment.appointmentDateTime);

/** Derives the latest, last and next visits from one patient's appointments. */
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

/** Joins a patient with their visit facts; the provider comes from the latest visit. */
export function toRosterRow(
  patient: PatientListItem,
  visits?: PatientVisits,
): PatientVisitRow {
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

export class PatientService extends CrudService<
  Patient,
  PatientInput,
  SearchOptions,
  PatientListItem
> {
  constructor(
    patientRepo: PatientRepository,
    private readonly appointments: AppointmentRepository,
    private readonly patientAllergies: PatientAllergyRepository,
    private readonly providerRoster: ProviderRosterRepository,
  ) {
    super(patientRepo, "Patient");
  }
  protected validate = validatePatient;
  protected async ensureDeletable(id: string) {
    const { totalCount: count } = await this.appointments.search({
      page: 1,
      pageSize: 1,
      patientId: id,
    });
    assertNoDependents(
      count,
      (n) => `Cannot delete: patient has ${n} appointment(s).`,
    );
  }
  /** Cascades the patient's allergy records (owned data) before removing the patient. */
  async delete(id: string): Promise<void> {
    await this.ensureDeletable(id);
    const records = await this.patientAllergies.listByPatient(id);
    await Promise.all(
      records.map((pa) =>
        this.patientAllergies.delete(pa.patientId, pa.allergyId),
      ),
    );
    await this.repo.delete(id);
  }

  /** Every appointment matching the filter, read page by page from the port. */
  private async listAppointments(
    providerId?: string,
  ): Promise<AppointmentListItem[]> {
    const items: AppointmentListItem[] = [];
    for (let page = 1; ; page++) {
      const result = await this.appointments.search({
        page,
        pageSize: APPOINTMENT_PAGE_SIZE,
        providerId,
      });
      items.push(...result.items);
      if (result.items.length === 0 || items.length >= result.totalCount)
        return items;
    }
  }

  /**
   * Visit facts per patient for the admin page. `patientIds` limits the result to those patients;
   * `providerId` counts only that provider's appointments.
   */
  async visitsByPatient(options: {
    patientIds?: string[];
    providerId?: string;
    now: number;
  }): Promise<Map<string, PatientVisits>> {
    const visits = new Map<string, PatientVisits>();
    if (options.patientIds?.length === 0) return visits;
    const wanted = options.patientIds && new Set(options.patientIds);
    const byPatient = new Map<string, AppointmentListItem[]>();
    for (const appointment of await this.listAppointments(options.providerId)) {
      if (wanted && !wanted.has(appointment.patientId)) continue;
      const list = byPatient.get(appointment.patientId) ?? [];
      list.push(appointment);
      byPatient.set(appointment.patientId, list);
    }
    for (const [patientId, list] of byPatient) {
      visits.set(patientId, summarizeVisits(list, options.now));
    }
    return visits;
  }

  /**
   * A provider's patients, paged and searched by the API. The provider is the
   * caller for the doctor's own roster; the API checks access.
   */
  listRoster({
    providerId,
    ...options
  }: SearchOptions & { providerId: string }): Promise<
    PagedResult<PatientRosterRow>
  > {
    return this.providerRoster.searchProviderRoster(providerId, options);
  }
}
