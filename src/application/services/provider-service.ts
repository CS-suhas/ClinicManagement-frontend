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

  /** The public, bookable doctors: verified and in a clinic. Needs no sign-in. */
  directory(
    options: ProviderDirectoryOptions,
  ): Promise<PagedResult<ProviderDirectoryEntry>> {
    return this.directoryRepo.list(options);
  }

  /** Admins filter by any status; everyone else only ever sees VERIFIED. */
  searchByStatus(
    options: VerificationSearchOptions,
  ): Promise<PagedResult<Provider>> {
    return this.verificationRepo.searchByStatus(options);
  }

  /** Admin only. From PENDING or REJECTED. */
  verify(id: string): Promise<void> {
    return this.verificationRepo.verify(id);
  }

  /** Admin only. From PENDING. */
  reject(id: string): Promise<void> {
    return this.verificationRepo.reject(id);
  }
}
