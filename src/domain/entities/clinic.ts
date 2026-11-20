import type { FieldErrors } from "../errors";
import { isBlank, isPhone } from "../validation";

export interface Clinic {
  id: string;
  name: string;
  location: string | null;
  phoneNumber: string;
}

export type ClinicInput = Omit<Clinic, "id">;

export function validateClinic(input: ClinicInput): FieldErrors {
  const errors: FieldErrors = {};
  if (isBlank(input.name)) errors.name = "Name is required";
  if (!isBlank(input.phoneNumber) && !isPhone(input.phoneNumber))
    errors.phoneNumber = "Invalid phone number";
  return errors;
}
