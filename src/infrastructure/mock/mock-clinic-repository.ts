import type { Clinic, ClinicInput, Provider } from "@/domain/entities";
import type {
  ClinicRepository,
  PagedResult,
  SearchOptions,
} from "@/domain/repositories";
import type { LocalStorageCollection } from "./local-storage-collection";
import { MockCrudRepository } from "./mock-repositories";

export class MockClinicRepository
  extends MockCrudRepository<Clinic, ClinicInput>
  implements ClinicRepository
{
  constructor(
    store: LocalStorageCollection<Clinic>,
    private readonly providers: { list(): Promise<Provider[]> },
  ) {
    super(store, "Clinic");
  }

  private async withProviderCounts(clinics: Clinic[]): Promise<Clinic[]> {
    const counts = new Map<string, number>();
    for (const provider of await this.providers.list())
      if (provider.verificationStatus === "VERIFIED")
        counts.set(provider.clinicId, (counts.get(provider.clinicId) ?? 0) + 1);
    return clinics.map((clinic) => ({
      ...clinic,
      providerCount: counts.get(clinic.id) ?? 0,
    }));
  }

  override async list(): Promise<Clinic[]> {
    return this.withProviderCounts(await super.list());
  }

  override async search(options: SearchOptions): Promise<PagedResult<Clinic>> {
    const result = await super.search(options);
    return { ...result, items: await this.withProviderCounts(result.items) };
  }
}
