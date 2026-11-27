import { z } from "zod";
import type { Schemas } from "@/lib/api";

export type Provider = Schemas["ProviderResponse"];

export const ProviderGender = z.enum(["MALE", "FEMALE", "OTHER"]);
export type ProviderGender = z.infer<typeof ProviderGender>;

export const providerGenderLabels = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
};

const FEE_LIMIT = 100_000_000;

export const providerForm = z.object({
  clinicId: z.string().min(1, "Clinic is required"),
  firstName: z
    .string()
    .refine((v) => v.trim() !== "", "First name is required"),
  lastName: z.string().refine((v) => v.trim() !== "", "Last name is required"),
  specialty: z.string().refine((v) => v.trim() !== "", "Specialty is required"),
  fee: z
    .number()
    .nullable()
    .superRefine((fee, ctx) => {
      if (fee === null) return;
      if (!Number.isFinite(fee) || fee < 0 || fee >= FEE_LIMIT)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Fee must be 0 or more and less than 100,000,000",
        });
      else if (Math.abs(fee * 100 - Math.round(fee * 100)) > 1e-6)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Fee can have at most 2 decimal places",
        });
    }),
  gender: ProviderGender.nullable(),
});
export type ProviderForm = z.infer<typeof providerForm>;

export const providerDefaults: ProviderForm = {
  clinicId: "",
  firstName: "",
  lastName: "",
  specialty: "",
  fee: null,
  gender: null,
};
