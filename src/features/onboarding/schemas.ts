import { z } from "zod";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\-\s\d]{7,20}$/;
const FEE_LIMIT = 100_000_000;

export const ProviderGender = z.enum(["MALE", "FEMALE", "OTHER", "NONE"]);
export type ProviderGender = z.infer<typeof ProviderGender>;

const feeValue = (fee: string) => Number(fee);

export const patientForm = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date")
    .refine(
      (value) => new Date(value) <= new Date(),
      "Date of birth cannot be in the future",
    ),
  phoneNumber: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .regex(PHONE_RE, "Invalid phone number"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .regex(EMAIL_RE, "Invalid email"),
});
export type PatientForm = z.infer<typeof patientForm>;

export const doctorForm = z.object({
  clinicId: z.string().min(1, "Clinic is required"),
  clinicName: z.string(),
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  specialty: z.string().trim().min(1, "Specialty is required"),
  fee: z
    .string()
    .trim()
    .refine(
      (fee) =>
        fee === "" ||
        (Number.isFinite(feeValue(fee)) &&
          feeValue(fee) >= 0 &&
          feeValue(fee) < FEE_LIMIT),
      "Fee must be 0 or more and less than 100,000,000",
    )
    .refine(
      (fee) =>
        fee === "" ||
        Math.abs(feeValue(fee) * 100 - Math.round(feeValue(fee) * 100)) <= 1e-6,
      "Fee can have at most 2 decimal places",
    ),
  gender: ProviderGender,
});
export type DoctorForm = z.infer<typeof doctorForm>;
