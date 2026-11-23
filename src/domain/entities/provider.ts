import type { VerificationStatus } from "../auth";
import type { FieldErrors } from "../errors";
import { isBlank } from "../validation";

export const PROVIDER_GENDERS = ["MALE", "FEMALE", "OTHER"] as const;
export type ProviderGender = (typeof PROVIDER_GENDERS)[number];

export const PROVIDER_GENDER_LABELS: Record<ProviderGender, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
};

export interface Provider {
  id: string;
  /** Normalised to "" when the API has none (a self-registered doctor). */
  clinicId: string;
  firstName: string;
  lastName: string;
  specialty: string;
  /** Consultation fee; null when not set. */
  fee?: number | null;
  gender?: ProviderGender | null;
  verificationStatus?: VerificationStatus;
}

/** What the admin form sends. Verification is set by the backend, not here. */
export type ProviderInput = Omit<Provider, "id" | "verificationStatus">;

export const providerFullName = (
  provider: Pick<Provider, "firstName" | "lastName">,
) => `${provider.firstName} ${provider.lastName}`.trim();

const FEE_LIMIT = 100_000_000;

const isProviderGender = (value: string): value is ProviderGender =>
  (PROVIDER_GENDERS as readonly string[]).includes(value.toUpperCase());

export function validateProvider(input: ProviderInput): FieldErrors {
  const errors: FieldErrors = {};
  if (isBlank(input.clinicId)) errors.clinicId = "Clinic is required";
  if (isBlank(input.firstName)) errors.firstName = "First name is required";
  if (isBlank(input.lastName)) errors.lastName = "Last name is required";
  if (isBlank(input.specialty)) errors.specialty = "Specialty is required";
  if (input.fee != null) {
    const { fee } = input;
    // Compare in hundredths with a tolerance so 19.99 is not rejected by float error.
    const hundredths = fee * 100;
    if (!Number.isFinite(fee) || fee < 0 || fee >= FEE_LIMIT)
      errors.fee = "Fee must be 0 or more and less than 100,000,000";
    else if (Math.abs(hundredths - Math.round(hundredths)) > 1e-6)
      errors.fee = "Fee can have at most 2 decimal places";
  }
  if (input.gender && !isProviderGender(input.gender))
    errors.gender = "Gender must be male, female or other";
  return errors;
}
