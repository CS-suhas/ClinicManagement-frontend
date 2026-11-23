import type { FieldErrors } from "../errors";
import { isBlank } from "../validation";

export interface AllergyType {
  id: string;
  name: string;
  /** Patients with this allergy recorded. Optional for older responses; delete is blocked above 0. */
  patientCount?: number;
}

export type AllergyTypeInput = Omit<AllergyType, "id">;

export function validateAllergyType(input: AllergyTypeInput): FieldErrors {
  const errors: FieldErrors = {};
  if (isBlank(input.name)) errors.name = "Allergy name is required";
  return errors;
}
