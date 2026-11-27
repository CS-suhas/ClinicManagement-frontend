import { z } from "zod";
import type { Schemas } from "@/lib/api";

export const Role = z.enum(["patient", "doctor", "admin", "clinicadmin"]);
export type Role = z.infer<typeof Role>;

export type VerificationStatus = Schemas["ProviderVerificationStatus"];
export const VERIFICATION_STATUSES = [
  "PENDING",
  "VERIFIED",
  "REJECTED",
] as const satisfies readonly VerificationStatus[];
export const VerificationStatus = z.enum(VERIFICATION_STATUSES);

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
