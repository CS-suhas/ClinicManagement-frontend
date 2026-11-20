import type { FieldErrors } from "../errors";
import { isBlank } from "../validation";

export interface AllergyType {
  id: string;
  name: string;
}

export type AllergyTypeInput = Omit<AllergyType, "id">;

export function validateAllergyType(input: AllergyTypeInput): FieldErrors {
  const errors: FieldErrors = {};
  if (isBlank(input.name)) errors.name = "Allergy name is required";
  return errors;
}
