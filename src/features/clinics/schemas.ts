import { z } from "zod";
import type { Schemas } from "@/lib/api";

export type Clinic = Schemas["ClinicListItemResponse"];

const PHONE_PATTERN = /^[+()\-\s\d]{7,20}$/;

export const clinicForm = z.object({
  name: z.string().refine((value) => value.trim() !== "", "Name is required"),
  address: z.string().transform((value) => value || null),
  phoneNumber: z
    .string()
    .refine(
      (value) => value.trim() === "" || PHONE_PATTERN.test(value.trim()),
      "Invalid phone number",
    ),
});
export type ClinicForm = z.infer<typeof clinicForm>;

export const clinicDefaults: z.input<typeof clinicForm> = {
  name: "",
  address: "",
  phoneNumber: "",
};
