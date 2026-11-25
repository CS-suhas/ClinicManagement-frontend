import type { AllergyType, Patient, PatientAllergy } from "@/domain/entities";
import { NotFoundError } from "@/domain/errors";
import type {
  CrudRepository,
  PagedResult,
  PatientAllergyRepository,
  ProviderSearchOptions,
  SearchOptions,
} from "@/domain/repositories";
import { delay, type LocalStorageCollection } from "./local-storage-collection";

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export class MockCrudRepository<T extends { id: string }, TInput>
  implements CrudRepository<T, TInput>
{
  constructor(
    protected readonly store: LocalStorageCollection<T>,
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
    private readonly patients: LocalStorageCollection<Patient>,
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

  async listPatientsByAllergy(allergyId: string) {
    await delay();
    const ids = new Set(
      this.store
        .read()
        .filter((x) => x.allergyId === allergyId)
        .map((x) => x.patientId),
    );
    return this.patients.read().filter((p) => ids.has(p.id));
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
