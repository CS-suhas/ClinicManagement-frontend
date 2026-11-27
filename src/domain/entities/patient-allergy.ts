import type { FieldErrors } from "../errors";
import { isBlank } from "../validation";

export type Severity = string;

/** Known severities, lowest first. The API sends them uppercase. */
export const SEVERITY_LEVELS = ["MILD", "MODERATE", "SEVERE"] as const;

/** 0 for unknown or missing, then 1 mild, 2 moderate, 3 severe. */
export function severityRank(severity: string | null | undefined): number {
  const index = SEVERITY_LEVELS.indexOf(
    (severity ?? "").trim().toUpperCase() as (typeof SEVERITY_LEVELS)[number],
  );
  return index + 1;
}

/** The highest-ranked severity of a list (as stored), or null when the list is empty. */
export function highestSeverity(
  severities: readonly (string | null | undefined)[],
): string | null {
  let best: string | null = null;
  for (const severity of severities) {
    if (best === null || severityRank(severity) > severityRank(best))
      best = severity ?? null;
  }
  return best;
}

/** Join entity between Patient and AllergyType. Composite key: (patientId, allergyId). */
export type PatientAllergy = {
  patientId: string;
  allergyId: string;
  allergyName?: string;
  notes: string;
  severity: Severity;
};

export function validatePatientAllergy(input: PatientAllergy): FieldErrors {
  const errors: FieldErrors = {};
  if (isBlank(input.patientId)) errors.patientId = "Patient is required";
  if (isBlank(input.allergyId)) errors.allergyId = "Allergy is required";
  if (isBlank(input.severity)) errors.severity = "Severity is required";
  return errors;
}
