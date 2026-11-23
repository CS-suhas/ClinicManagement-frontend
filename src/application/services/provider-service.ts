import {
  type Provider,
  type ProviderInput,
  validateProvider,
} from "@/domain/entities";
import { assertNoDependents } from "@/domain/errors";
import type {
  AppointmentRepository,
  ProviderRepository,
  ProviderSearchOptions,
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
}
