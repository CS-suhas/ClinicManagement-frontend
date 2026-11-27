import type { CurrentUser, VerificationStatus } from "@/domain/auth";
import type { Clinic, Provider, ProviderInput } from "@/domain/entities";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "@/domain/errors";
import type {
  PagedResult,
  ProviderDirectoryEntry,
  ProviderDirectoryOptions,
  ProviderDirectoryRepository,
  ProviderRepository,
  ProviderVerificationRepository,
  SearchOptions,
  VerificationSearchOptions,
} from "@/domain/repositories";
import { delay, type LocalStorageCollection } from "./local-storage-collection";
import { MockCrudRepository } from "./mock-repositories";

type Listable<T> = {
  list(): Promise<T[]>;
};

const paginate = <T>(items: T[], options: SearchOptions): PagedResult<T> => {
  const start = (options.page - 1) * options.pageSize;
  return {
    items: items.slice(start, start + options.pageSize),
    totalCount: items.length,
    page: options.page,
    pageSize: options.pageSize,
  };
};

const matchesSearch = (search: string | undefined, values: string[]) => {
  const query = search?.trim().toLowerCase();
  return !query || values.some((value) => value.toLowerCase().includes(query));
};

export class MockProviderRepository
  extends MockCrudRepository<Provider, ProviderInput>
  implements ProviderRepository
{
  constructor(store: LocalStorageCollection<Provider>) {
    super(store, "Provider");
  }

  async create(input: ProviderInput, id?: string): Promise<Provider> {
    return super.create(
      { ...input, verificationStatus: "VERIFIED" } as ProviderInput,
      id,
    );
  }
}

export function createMockProviderDirectoryRepository(repositories: {
  providers: Listable<Provider>;
  clinics: Listable<Clinic>;
}): ProviderDirectoryRepository {
  return {
    async list(
      options: ProviderDirectoryOptions,
    ): Promise<PagedResult<ProviderDirectoryEntry>> {
      await delay();
      const [providers, clinics] = await Promise.all([
        repositories.providers.list(),
        repositories.clinics.list(),
      ]);
      const clinicNames = new Map(
        clinics.map((clinic) => [clinic.id, clinic.name]),
      );
      const matches = providers
        .filter((provider) => provider.verificationStatus === "VERIFIED")
        .map((provider) => ({
          ...provider,
          clinicName: clinicNames.get(provider.clinicId) ?? null,
        }))
        .filter(
          (entry) => !options.clinicId || entry.clinicId === options.clinicId,
        )
        .filter((entry) =>
          matchesSearch(options.search, [
            entry.firstName,
            entry.lastName,
            entry.specialty,
            entry.clinicName ?? "",
          ]),
        );
      return paginate(matches, options);
    },
  };
}

export class MockProviderVerificationRepository
  implements ProviderVerificationRepository
{
  constructor(
    private readonly store: LocalStorageCollection<Provider>,
    private readonly currentUser: () => Promise<CurrentUser | null>,
  ) {}

  async searchByStatus(
    options: VerificationSearchOptions,
  ): Promise<PagedResult<Provider>> {
    await delay();
    const user = await this.currentUser();
    const status: VerificationStatus | undefined = user?.roles.includes("admin")
      ? options.verificationStatus
      : "VERIFIED";
    const matches = this.store
      .read()
      .filter(
        (provider) =>
          (!status || (provider.verificationStatus ?? "PENDING") === status) &&
          matchesSearch(options.search, [
            provider.firstName,
            provider.lastName,
            provider.specialty,
          ]),
      );
    return paginate(matches, options);
  }

  async listByClinic(clinicId: string): Promise<Provider[]> {
    await delay();
    const user = await this.currentUser();
    if (!user) throw new UnauthorizedError();
    const seesApplicants =
      user.roles.includes("admin") || user.clinicAdminOf.includes(clinicId);
    return this.store
      .read()
      .filter(
        (provider) =>
          provider.clinicId === clinicId &&
          (seesApplicants || provider.verificationStatus === "VERIFIED"),
      );
  }

  verify(id: string): Promise<void> {
    return this.transition(id, "verify", ["PENDING", "REJECTED"], "VERIFIED");
  }

  reject(id: string): Promise<void> {
    return this.transition(id, "reject", ["PENDING"], "REJECTED");
  }

  private async transition(
    id: string,
    action: "verify" | "reject",
    allowedFrom: VerificationStatus[],
    to: VerificationStatus,
  ): Promise<void> {
    await delay();
    const user = await this.currentUser();
    if (!user) throw new UnauthorizedError();
    const providers = this.store.read();
    const index = providers.findIndex((provider) => provider.id === id);
    if (index < 0) throw new NotFoundError("Provider", id);
    const mayDecide =
      user.roles.includes("admin") ||
      user.clinicAdminOf.includes(providers[index].clinicId);
    if (!mayDecide) throw new ForbiddenError();
    const current = providers[index].verificationStatus ?? "PENDING";
    if (!allowedFrom.includes(current))
      throw new ConflictError(
        `Cannot ${action} a provider that is ${current.toLowerCase()}.`,
      );
    providers[index] = { ...providers[index], verificationStatus: to };
    this.store.write(providers);
  }
}
