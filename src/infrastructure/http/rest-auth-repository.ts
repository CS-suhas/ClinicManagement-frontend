import type { AuthRepository, CurrentUser, MeResponse } from "@/domain/auth";
import { UnauthorizedError } from "@/domain/errors";
import type { HttpClient } from "./http-client";

/**
 * Session backed by the API's GET /api/me. Sign-in is not wired yet.
 * TODO(keycloak): add the Keycloak client (e.g. keycloak-js or an OIDC library),
 * implement signIn/signOut with the redirect flow, and return the access token
 * from getAccessToken so HttpClient sends it as a Bearer header.
 */
export class RestAuthRepository implements AuthRepository {
  constructor(private readonly http: HttpClient) {}

  async getCurrentUser(): Promise<CurrentUser | null> {
    try {
      const me = await this.http.get<MeResponse>("/me");
      // The API does not return a display name yet, so the subject stands in.
      return { ...me, displayName: me.subject };
    } catch (e) {
      if (e instanceof UnauthorizedError) return null;
      throw e;
    }
  }

  async signIn(): Promise<CurrentUser> {
    throw new Error("Keycloak sign-in not configured");
  }

  async signOut(): Promise<void> {
    throw new Error("Keycloak sign-in not configured");
  }

  /** TODO(keycloak): return the Keycloak access token. */
  async getAccessToken(): Promise<string | null> {
    return null;
  }
}
