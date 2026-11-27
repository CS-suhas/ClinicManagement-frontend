import {
  type AllergyType,
  type AllergyTypeInput,
  highestSeverity,
  type Patient,
  type PatientAllergy,
  type PatientInput,
  type PatientListItem,
} from "@/domain/entities";
import type {
  PagedResult,
  PatientRepository,
  SearchOptions,
} from "@/domain/repositories";
import { delay, type LocalStorageCollection } from "./local-storage-collection";
import { MockCrudRepository } from "./mock-repositories";

function allergySummaries(records: PatientAllergy[]) {
  const severities = new Map<string, string[]>();
  for (const record of records) {
    const list = severities.get(record.patientId) ?? [];
    list.push(record.severity);
    severities.set(record.patientId, list);
  }
  return new Map(
    [...severities].map(([patientId, list]) => [
      patientId,
      { allergyCount: list.length, highestSeverity: highestSeverity(list) },
    ]),
  );
}

export class MockPatientRepository
  extends MockCrudRepository<Patient, PatientInput>
  implements PatientRepository
{
  constructor(
    store: LocalStorageCollection<Patient>,
    private readonly allergies: LocalStorageCollection<PatientAllergy>,
  ) {
    super(store, "Patient");
  }

  private withSummaries(patients: Patient[]): PatientListItem[] {
    const summaries = allergySummaries(this.allergies.read());
    return patients.map((patient) => {
      const summary = summaries.get(patient.id);
      return {
        ...patient,
        allergyCount: summary?.allergyCount ?? 0,
        highestSeverity: summary?.highestSeverity ?? null,
      };
    });
  }

  async list(): Promise<PatientListItem[]> {
    await delay();
    return this.withSummaries(this.store.read());
  }

  async getById(id: string): Promise<PatientListItem | null> {
    await delay();
    const patient = this.store.read().find((item) => item.id === id);
    return patient ? this.withSummaries([patient])[0] : null;
  }

  async search(options: SearchOptions): Promise<PagedResult<PatientListItem>> {
    await delay();
    const needle = options.search?.trim().toLowerCase();
    const matches = this.store
      .read()
      .filter(
        (patient) =>
          !needle ||
          Object.values(patient).some(
            (value) =>
              typeof value === "string" && value.toLowerCase().includes(needle),
          ),
      );
    const start = (options.page - 1) * options.pageSize;
    return {
      items: this.withSummaries(matches.slice(start, start + options.pageSize)),
      totalCount: matches.length,
      page: options.page,
      pageSize: options.pageSize,
    };
  }
}

export class MockAllergyTypeRepository extends MockCrudRepository<
  AllergyType,
  AllergyTypeInput
> {
  constructor(
    store: LocalStorageCollection<AllergyType>,
    private readonly records: LocalStorageCollection<PatientAllergy>,
  ) {
    super(store, "Allergy type");
  }

  private withCounts(types: AllergyType[]): AllergyType[] {
    const counts = new Map<string, number>();
    for (const record of this.records.read())
      counts.set(record.allergyId, (counts.get(record.allergyId) ?? 0) + 1);
    return types.map((type) => ({
      ...type,
      patientCount: counts.get(type.id) ?? 0,
    }));
  }

  async list(): Promise<AllergyType[]> {
    await delay();
    return this.withCounts(this.store.read());
  }

  async getById(id: string): Promise<AllergyType | null> {
    await delay();
    const type = this.store.read().find((item) => item.id === id);
    return type ? this.withCounts([type])[0] : null;
  }
}
