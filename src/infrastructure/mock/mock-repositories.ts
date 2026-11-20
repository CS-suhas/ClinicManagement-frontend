import type { PatientAllergy } from "@/domain/entities";
import { NotFoundError } from "@/domain/errors";
import type {
  CrudRepository,
  PatientAllergyRepository,
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

  async getById(id: string): Promise<T | null> {
    await delay();
    return this.store.read().find((x) => x.id === id) ?? null;
  }

  async create(input: TInput): Promise<T> {
    await delay();
    const item = { ...input, id: newId() } as unknown as T;
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
  constructor(private readonly store: LocalStorageCollection<PatientAllergy>) {}

  async listByPatient(patientId: string) {
    await delay();
    return this.store.read().filter((x) => x.patientId === patientId);
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
