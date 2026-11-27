import {
  type CurrentUser,
  Role,
  type VerificationStatus,
} from "@/features/auth/schemas";
import type {
  Patient,
  PatientInput,
  Provider,
  ProviderRegistrationInput,
} from "./entities";

export type { CurrentUser, Role, VerificationStatus };
export const ROLES = Role.options;

export type MeResponse = {
  subject: string;
  roles: Role[];
  patient: { id: string } | null;
  provider: {
    id: string;
    verificationStatus: VerificationStatus;
    clinicId: string;
  } | null;
  displayName: string | null;
  clinicAdminOf: string[];
};

export type AuthPersona = {
  id: string;
  label: string;
  description: string;
  user: CurrentUser;
};

export type SignInOptions = {
  returnTo?: string;
  register?: boolean;
};

export type { PublicAccess } from "@/lib/runtime-config";

export type AuthRepository = {
  getCurrentUser(): Promise<CurrentUser | null>;
  signIn(personaId?: string, options?: SignInOptions): Promise<CurrentUser>;
  completeSignIn(): Promise<{ returnTo: string | null }>;
  signOut(): Promise<void>;
  getAccessToken(): Promise<string | null>;
  onSessionExpired(listener: () => void): () => void;
  createPatientProfile(input: PatientInput): Promise<Patient>;
  registerAsProvider(input: ProviderRegistrationInput): Promise<Provider>;
};
