import type { Patient, PatientInput } from "./entities";

/** Roles understood by the API. A user can hold several at once. */
export const ROLES = ["patient", "doctor", "admin", "clinicadmin"] as const;
export type Role = (typeof ROLES)[number];

export type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";

/** Response of GET /api/me. */
export interface MeResponse {
  subject: string;
  roles: Role[];
  patient: { id: string } | null;
  provider: { id: string; verificationStatus: VerificationStatus } | null;
  /** Null when the API has no display name for the user. */
  displayName: string | null;
  /** Clinics the user administers. Empty unless the user holds the clinicadmin role. */
  clinicAdminOf: string[];
}

export interface CurrentUser extends Omit<MeResponse, "displayName"> {
  /** Falls back to the subject when the API has no display name. */
  displayName: string;
}

/** A demo identity offered by the mock sign-in picker. */
export interface AuthPersona {
  id: string;
  label: string;
  description: string;
  user: CurrentUser;
}

/** Port: session management. Mock and Keycloak-backed adapters implement it. */
export interface AuthRepository {
  /** Resolves to null when nobody is signed in. */
  getCurrentUser(): Promise<CurrentUser | null>;
  signIn(personaId?: string): Promise<CurrentUser>;
  signOut(): Promise<void>;
  /** Bearer token for API calls, or null when there is none. */
  getAccessToken(): Promise<string | null>;
  /** Creates the signed-in user's own patient record and links it to their account. */
  createPatientProfile(input: PatientInput): Promise<Patient>;
}
