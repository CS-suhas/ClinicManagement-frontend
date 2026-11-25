import type {
  AuthRepository,
  CurrentUser,
  MeResponse,
  SignInOptions,
} from "@/domain/auth";
import type {
  Patient,
  PatientInput,
  Provider,
  ProviderRegistrationInput,
} from "@/domain/entities";
import { UnauthorizedError } from "@/domain/errors";
import type { OidcSession } from "@/infrastructure/oidc/oidc-session";
import type { HttpClient } from "./http-client";

/**
 * Keycloak-backed session. Sign-in, sign-out and tokens come from the OIDC
 * session (Authorization Code + PKCE); who the user is comes from GET /api/me.
 */
export class RestAuthRepository implements AuthRepository {
  constructor(
    private readonly http: HttpClient,
    private readonly session: OidcSession,
  ) {}

  async getCurrentUser(): Promise<CurrentUser | null> {
    // No tokens means signed out; skip the /me round trip that would only 401.
    if (!(await this.session.hasSession())) return null;
    try {
      const me = await this.http.get<MeResponse>("/me");
      return {
        ...me,
        // Without a display name, the subject stands in.
        displayName: me.displayName ?? me.subject,
        clinicAdminOf: me.clinicAdminOf ?? [],
      };
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        // The API rejected the token (e.g. revoked); drop it so the user can sign in again.
        await this.session.clear();
        return null;
      }
      throw e;
    }
  }

  /** Redirects to Keycloak; the page unloads, so the promise never resolves. */
  async signIn(
    _personaId?: string,
    options: SignInOptions = {},
  ): Promise<CurrentUser> {
    await this.session.signIn(options);
    return new Promise<CurrentUser>(() => {});
  }

  completeSignIn(): Promise<{ returnTo: string | null }> {
    return this.session.completeSignIn();
  }

  signOut(): Promise<void> {
    return this.session.signOut();
  }

  getAccessToken(): Promise<string | null> {
    return this.session.getAccessToken();
  }

  onSessionExpired(listener: () => void): () => void {
    return this.session.onSessionExpired(listener);
  }

  /** The API links the new patient to the caller. A second call returns 409. */
  async createPatientProfile(input: PatientInput): Promise<Patient> {
    const created = await this.http.post<{ id: string }>("/me/patient", {
      id: crypto.randomUUID(),
      ...input,
    });
    return { ...input, id: created.id };
  }

  /**
   * The API links the new provider to the caller. It returns 404 when the clinic
   * does not exist and 409 when the caller already has a provider.
   */
  async registerAsProvider(
    input: ProviderRegistrationInput,
  ): Promise<Provider> {
    const id = crypto.randomUUID();
    await this.http.post<unknown>("/providers/register", {
      id,
      clinicId: input.clinicId,
      firstName: input.firstName,
      lastName: input.lastName,
      specialty: input.specialty,
      fee: input.fee ?? undefined,
      gender: input.gender ?? undefined,
    });
    return {
      id,
      clinicId: input.clinicId,
      firstName: input.firstName,
      lastName: input.lastName,
      specialty: input.specialty,
      fee: input.fee ?? null,
      gender: input.gender ?? null,
      verificationStatus: "PENDING",
    };
  }
}
