import type { CurrentUser } from "@/domain/auth";
import {
  type Patient,
  type PatientInput,
  validatePatient,
} from "@/domain/entities";
import { assertValid } from "@/domain/errors";
import type { AuthRepository } from "@/domain/repositories";

export class AuthService {
  constructor(private readonly repo: AuthRepository) {}

  getCurrentUser(): Promise<CurrentUser | null> {
    return this.repo.getCurrentUser();
  }

  signIn(personaId?: string): Promise<CurrentUser> {
    return this.repo.signIn(personaId);
  }

  signOut(): Promise<void> {
    return this.repo.signOut();
  }

  getAccessToken(): Promise<string | null> {
    return this.repo.getAccessToken();
  }

  /** Validates the details, then creates the signed-in user's patient profile. */
  createPatientProfile(input: PatientInput): Promise<Patient> {
    assertValid(validatePatient(input));
    return this.repo.createPatientProfile(input);
  }
}
