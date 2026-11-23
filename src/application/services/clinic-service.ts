import {
  type Clinic,
  type ClinicInput,
  validateClinic,
} from "@/domain/entities";
import { assertNoDependents } from "@/domain/errors";
import type {
  ClinicRepository,
  ProviderRepository,
} from "@/domain/repositories";
import { CrudService } from "./crud-service";

export class ClinicService extends CrudService<Clinic, ClinicInput> {
  constructor(
    clinicRepo: ClinicRepository,
    private readonly providers: ProviderRepository,
  ) {
    super(clinicRepo, "Clinic");
  }
  protected validate = validateClinic;
  protected async ensureDeletable(id: string) {
    const { totalCount: count } = await this.providers.search({
      page: 1,
      pageSize: 1,
      clinicId: id,
    });
    assertNoDependents(
      count,
      (n) => `Cannot delete: ${n} provider(s) still belong to this clinic.`,
    );
  }
}
