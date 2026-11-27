import type { CurrentUser, SignInOptions } from "@/domain/auth";
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

  signIn(personaId?: string, options?: SignInOptions): Promise<CurrentUser> {
    return this.repo.signIn(personaId, options);
  }

  completeSignIn(): Promise<{ returnTo: string | null }> {
    return this.repo.completeSignIn();
  }

  signOut(): Promise<void> {
    return this.repo.signOut();
  }

  getAccessToken(): Promise<string | null> {
    return this.repo.getAccessToken();
  }

  onSessionExpired(listener: () => void): () => void {
    return this.repo.onSessionExpired(listener);
  }

  createPatientProfile(input: PatientInput): Promise<Patient> {
    assertValid(validatePatient(input));
    return this.repo.createPatientProfile(input);
  }

  registerAsProvider(input: ProviderRegistrationInput): Promise<Provider> {
    assertValid(validateProviderRegistration(input));
    return this.repo.registerAsProvider(input);
  }
}
