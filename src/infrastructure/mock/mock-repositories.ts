import type {
  AllergyType,
  Appointment,
  AppointmentInput,
  Patient,
  PatientAllergy,
  Provider,
} from "@/domain/entities";
import { NotFoundError } from "@/domain/errors";
import type {
  AppointmentListItem,
  AppointmentRepository,
  AppointmentSearchOptions,
  CrudRepository,
  PagedResult,
  PatientAllergyRepository,
  ProviderSearchOptions,
  SearchOptions,
} from "@/domain/repositories";
import { delay, type LocalStorageCollection } from "./local-storage-collection";

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export class MockCrudRepository<T extends { id: string }, TInput>
  implements CrudRepository<T, TInput>
{
  constructor(
    private readonly store: LocalStorageCollection<T>,
    private readonly entityName: string,
  ) {}

  async list(): Promise<T[]> {
    await delay();
    return this.store.read();
  }

  async search(
    options: SearchOptions | ProviderSearchOptions,
  ): Promise<PagedResult<T>> {
    const items = await this.list();
    const search = options.search?.trim().toLowerCase();
    const filtered = items.filter((item) => {
      if (
        search &&
        !Object.values(item).some(
          (value) =>
            typeof value === "string" && value.toLowerCase().includes(search),
        )
      )
        return false;
      if (
        "clinicId" in options &&
        options.clinicId &&
        (!("clinicId" in item) || item.clinicId !== options.clinicId)
      )
        return false;
      return true;
    });
    const start = (options.page - 1) * options.pageSize;
    return {
      items: filtered.slice(start, start + options.pageSize),
      totalCount: filtered.length,
      page: options.page,
      pageSize: options.pageSize,
    };
  }

  async getById(id: string): Promise<T | null> {
    await delay();
    return this.store.read().find((x) => x.id === id) ?? null;
  }

  async create(input: TInput, id: string = newId()): Promise<T> {
    await delay();
    const item = { ...input, id } as unknown as T;
    this.store.write([...this.store.read(), item]);
    return item;
  }

  async update(id: string, input: TInput): Promise<T> {
    await delay();
    const items = this.store.read();
    const idx = items.findIndex((x) => x.id === id);
    if (idx < 0) throw new NotFoundError(this.entityName, id);
    const updated = { ...items[idx], ...input, id } as T;
    items[idx] = updated;
    this.store.write(items);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await delay();
    this.store.write(this.store.read().filter((x) => x.id !== id));
  }
}

export class MockPatientAllergyRepository implements PatientAllergyRepository {
  constructor(
    private readonly store: LocalStorageCollection<PatientAllergy>,
    private readonly allergyTypes: LocalStorageCollection<AllergyType>,
  ) {}

  async listByPatient(patientId: string) {
    await delay();
    return this.store.read().filter((x) => x.patientId === patientId);
  }

  async searchByPatient(patientId: string, options: SearchOptions) {
    await delay();
    const names = new Map(
      this.allergyTypes.read().map((type) => [type.id, type.name]),
    );
    const search = options.search?.trim().toLowerCase();
    const matches = this.store
      .read()
      .filter((record) => record.patientId === patientId)
      .map((record) => ({
        ...record,
        allergyName: names.get(record.allergyId) ?? record.allergyId,
      }))
      .filter(
        (record) =>
          !search || record.allergyName?.toLowerCase().includes(search),
      );
    const start = (options.page - 1) * options.pageSize;
    return {
      items: matches.slice(start, start + options.pageSize),
      totalCount: matches.length,
      page: options.page,
      pageSize: options.pageSize,
    };
  }

  async allergyOptions(
    patientId: string,
    options: SearchOptions & { selectedAllergyId?: string },
  ) {
    await delay();
    const recorded = new Set(
      this.store
        .read()
        .filter((record) => record.patientId === patientId)
        .map((record) => record.allergyId),
    );
    const search = options.search?.trim().toLowerCase();
    const matches = this.allergyTypes
      .read()
      .filter(
        (type) =>
          (!recorded.has(type.id) || type.id === options.selectedAllergyId) &&
          (!search || type.name.toLowerCase().includes(search)),
      );
    const start = (options.page - 1) * options.pageSize;
    return {
      items: matches.slice(start, start + options.pageSize),
      totalCount: matches.length,
      page: options.page,
      pageSize: options.pageSize,
    };
  }

  async listByAllergy(allergyId: string) {
    await delay();
    return this.store.read().filter((x) => x.allergyId === allergyId);
  }

  async save(record: PatientAllergy) {
    await delay();
    const rest = this.store
      .read()
      .filter(
        (x) =>
          !(
            x.patientId === record.patientId && x.allergyId === record.allergyId
          ),
      );
    this.store.write([...rest, record]);
    return record;
  }

  async add(record: PatientAllergy) {
    return this.save(record);
  }

  async delete(patientId: string, allergyId: string) {
    await delay();
    this.store.write(
      this.store
        .read()
        .filter(
          (x) => !(x.patientId === patientId && x.allergyId === allergyId),
        ),
    );
  }
}

export class MockAppointmentRepository implements AppointmentRepository {
  private readonly crud: MockCrudRepository<Appointment, AppointmentInput>;

  constructor(
    store: LocalStorageCollection<Appointment>,
    private readonly getLookups: () => Promise<{
      patients: Patient[];
      providers: Provider[];
      clinics: { id: string; name: string }[];
    }>,
  ) {
    this.crud = new MockCrudRepository(store, "Appointment");
  }

  list() {
    return this.crud.list();
  }

  getById(id: string) {
    return this.crud.getById(id);
  }

  create(input: AppointmentInput, id?: string) {
    return this.crud.create(input, id);
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
    const [appointments, lookups] = await Promise.all([
      this.crud.list(),
      this.getLookups(),
    ]);
    const patients = new Map(lookups.patients.map((item) => [item.id, item]));
    const providers = new Map(lookups.providers.map((item) => [item.id, item]));
    const clinics = new Map(
      lookups.clinics.map((item) => [item.id, item.name]),
    );
    const search = options.search?.trim().toLowerCase();
    const filtered = appointments
      .map((appointment): AppointmentListItem => {
        const provider = providers.get(appointment.providerId);
        const clinicId = provider?.clinicId ?? "";
        return {
          ...appointment,
          patientName: patients.get(appointment.patientId)
            ? `${patients.get(appointment.patientId)?.firstName} ${patients.get(appointment.patientId)?.lastName}`.trim()
            : "",
          providerName: provider
            ? `${provider.firstName} ${provider.lastName}`.trim()
            : "",
          providerSpecialty: provider?.specialty ?? "",
          clinicId,
          clinicName: clinics.get(clinicId) ?? "",
        };
      })
      .filter((appointment) => {
        if (options.providerId && appointment.providerId !== options.providerId)
          return false;
        if (options.patientId && appointment.patientId !== options.patientId)
          return false;
        if (options.clinicId && appointment.clinicId !== options.clinicId)
          return false;
        const date = Date.parse(appointment.appointmentDateTime);
        if (options.from && date < Date.parse(options.from)) return false;
        if (options.to && date >= Date.parse(options.to)) return false;
        return (
          !search ||
          [
            appointment.patientName,
            appointment.providerName,
            appointment.providerSpecialty,
            appointment.clinicName,
            appointment.reasonForVisit,
          ].some((value) => value.toLowerCase().includes(search))
        );
      })
      // Compare instants, not text: public bookings carry an offset, admin entries do not.
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
}
