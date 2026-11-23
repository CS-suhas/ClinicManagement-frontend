import type { CurrentUser } from "@/domain/auth";
import {
  type Patient,
  type PatientInput,
  type Provider,
  type ProviderRegistrationInput,
  validatePatient,
  validateProviderRegistration,
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

  /**
   * Validates the details, then registers the signed-in user as a doctor. The
   * new provider is PENDING with no clinic until an admin verifies it.
   */
  registerAsProvider(input: ProviderRegistrationInput): Promise<Provider> {
    assertValid(validateProviderRegistration(input));
    return this.repo.registerAsProvider(input);
  }
}
