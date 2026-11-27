import {
  type Provider,
  type ProviderInput,
  validateProvider,
} from "@/domain/entities";
import { assertNoDependents } from "@/domain/errors";
import type {
  AppointmentRepository,
  PagedResult,
  ProviderDirectoryEntry,
  ProviderDirectoryOptions,
  ProviderDirectoryRepository,
  ProviderRepository,
  ProviderSearchOptions,
  ProviderVerificationRepository,
  VerificationSearchOptions,
} from "@/domain/repositories";
import { CrudService } from "./crud-service";

export class ProviderService extends CrudService<
  Provider,
  ProviderInput,
  ProviderSearchOptions
> {
  constructor(
    providerRepo: ProviderRepository,
    private readonly appointments: AppointmentRepository,
    private readonly directoryRepo: ProviderDirectoryRepository,
    private readonly verificationRepo: ProviderVerificationRepository,
  ) {
    super(providerRepo, "Provider");
  }
  protected validate = validateProvider;
  protected async ensureDeletable(id: string) {
    const { totalCount: count } = await this.appointments.search({
      page: 1,
      pageSize: 1,
      providerId: id,
    });
    assertNoDependents(
      count,
      (n) => `Cannot delete: provider has ${n} appointment(s).`,
    );
  }

  directory(
    options: ProviderDirectoryOptions,
  ): Promise<PagedResult<ProviderDirectoryEntry>> {
    return this.directoryRepo.list(options);
  }

  searchByStatus(
    options: VerificationSearchOptions,
  ): Promise<PagedResult<Provider>> {
    return this.verificationRepo.searchByStatus(options);
  }

  clinicRoster(clinicId: string): Promise<Provider[]> {
    return this.verificationRepo.listByClinic(clinicId);
  }

  verify(id: string): Promise<void> {
    return this.verificationRepo.verify(id);
  }

  reject(id: string): Promise<void> {
    return this.verificationRepo.reject(id);
  }
}
