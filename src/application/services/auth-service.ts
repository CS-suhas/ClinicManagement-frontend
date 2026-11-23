import type { CurrentUser } from "@/domain/auth";
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
}
