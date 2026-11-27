import { z } from "zod";
import type { Schemas } from "@/lib/api";

export const Role = z.enum(["patient", "doctor", "admin", "clinicadmin"]);
export type Role = z.infer<typeof Role>;

export const VerificationStatus = z.enum(["PENDING", "VERIFIED", "REJECTED"]);
export type VerificationStatus = z.infer<typeof VerificationStatus>;

export type CurrentUser = Omit<
  Schemas["MeResponse"],
  "subject" | "roles" | "displayName"
> & {
  subject: string;
  roles: Role[];
  displayName: string;
};

export type SignInOptions = {
  returnTo?: string;
  register?: boolean;
};
