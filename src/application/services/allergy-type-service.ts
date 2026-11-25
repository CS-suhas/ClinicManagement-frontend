import {
  type AllergyType,
  type AllergyTypeInput,
  validateAllergyType,
} from "@/domain/entities";
import { assertNoDependents } from "@/domain/errors";
import type {
  AllergyTypeRepository,
  PatientAllergyRepository,
} from "@/domain/repositories";
import { CrudService } from "./crud-service";

export class AllergyTypeService extends CrudService<
  AllergyType,
  AllergyTypeInput
> {
  constructor(
    allergyTypeRepo: AllergyTypeRepository,
    private readonly patientAllergies: PatientAllergyRepository,
  ) {
    super(allergyTypeRepo, "Allergy type");
  }
  protected validate = validateAllergyType;
  protected async ensureDeletable(id: string) {
    const count = (await this.patientAllergies.listPatientsByAllergy(id))
      .length;
    assertNoDependents(
      count,
      (n) => `Cannot delete: ${n} patient(s) have this allergy recorded.`,
    );
  }
}
