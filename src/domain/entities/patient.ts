import type { FieldErrors } from "../errors";
import { isBlank, isEmail, isPhone, isValidDate } from "../validation";

export type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  phoneNumber: string;
};

export type PatientInput = Omit<Patient, "id">;

export type PatientListItem = Patient & {
  allergyCount?: number;
  highestSeverity?: string | null;
};

export const patientFullName = (p: Pick<Patient, "firstName" | "lastName">) =>
  `${p.firstName} ${p.lastName}`.trim();

export function validatePatient(input: PatientInput): FieldErrors {
  const errors: FieldErrors = {};
  if (isBlank(input.firstName)) errors.firstName = "First name is required";
  if (isBlank(input.lastName)) errors.lastName = "Last name is required";
  if (isBlank(input.dateOfBirth))
    errors.dateOfBirth = "Date of birth is required";
  else if (!isValidDate(input.dateOfBirth)) errors.dateOfBirth = "Invalid date";
  else if (new Date(input.dateOfBirth) > new Date())
    errors.dateOfBirth = "Date of birth cannot be in the future";
  if (isBlank(input.email)) errors.email = "Email is required";
  else if (!isEmail(input.email)) errors.email = "Invalid email";
  if (isBlank(input.phoneNumber))
    errors.phoneNumber = "Phone number is required";
  else if (!isPhone(input.phoneNumber))
    errors.phoneNumber = "Invalid phone number";
  return errors;
}
