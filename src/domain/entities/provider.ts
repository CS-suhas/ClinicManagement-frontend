import type { FieldErrors } from "../errors";
import { isBlank } from "../validation";

export interface Provider {
  id: string;
  clinicId: string;
  firstName: string;
  lastName: string;
  specialty: string;
}

export type ProviderInput = Omit<Provider, "id">;

export const providerFullName = (
  provider: Pick<Provider, "firstName" | "lastName">,
) => `${provider.firstName} ${provider.lastName}`.trim();

export function validateProvider(input: ProviderInput): FieldErrors {
  const errors: FieldErrors = {};
  if (isBlank(input.clinicId)) errors.clinicId = "Clinic is required";
  if (isBlank(input.firstName)) errors.firstName = "First name is required";
  if (isBlank(input.lastName)) errors.lastName = "Last name is required";
  if (isBlank(input.specialty)) errors.specialty = "Specialty is required";
  return errors;
}
