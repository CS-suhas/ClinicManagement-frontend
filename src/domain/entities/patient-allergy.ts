import type { FieldErrors } from "../errors";
import { isBlank } from "../validation";

export type Severity = string;

/** Join entity between Patient and AllergyType. Composite key: (patientId, allergyId). */
export interface PatientAllergy {
  patientId: string;
  allergyId: string;
  notes: string;
  severity: Severity;
}

export function validatePatientAllergy(input: PatientAllergy): FieldErrors {
  const errors: FieldErrors = {};
  if (isBlank(input.patientId)) errors.patientId = "Patient is required";
  if (isBlank(input.allergyId)) errors.allergyId = "Allergy is required";
  if (isBlank(input.severity)) errors.severity = "Severity is required";
  return errors;
}
