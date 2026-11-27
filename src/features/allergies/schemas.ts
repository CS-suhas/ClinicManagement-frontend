import { z } from "zod";
import type { Schemas } from "@/lib/api";

export type AllergyType = Schemas["AllergyTypeResponse"];

export const allergyTypeForm = z.object({
  name: z.string().trim().min(1, "Allergy name is required"),
});
export type AllergyTypeForm = z.infer<typeof allergyTypeForm>;

export const allergyTypeDefaults: AllergyTypeForm = { name: "" };
