import {
  type AuthRepository,
  type CurrentUser,
  ROLES,
  type Role,
  type SignInOptions,
} from "@/domain/auth";
import type {
  Patient,
  PatientInput,
  Provider,
  ProviderRegistrationInput,
} from "@/domain/entities";
import { UnauthorizedError } from "@/domain/errors";
import type { OidcSession } from "@/lib/auth/oidc-session";
import type { ApiGet, ApiPost } from "./api-types";
import type { HttpClient } from "./http-client";

export class RestAuthRepository implements AuthRepository {
  constructor(
    private readonly http: HttpClient,
    private readonly session: OidcSession,
  ) {}

  async getCurrentUser(): Promise<CurrentUser | null> {
    if (!(await this.session.hasSession())) return null;
    try {
      const me = await this.http.get<ApiGet<"/me">>("/me");
      const subject = me.subject ?? "";
      return {
        ...me,
        subject,
        roles: me.roles.filter(isRole),
        displayName: me.displayName ?? subject,
        clinicAdminOf: me.clinicAdminOf ?? [],
      };
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        await this.session.clear();
        return null;
      }
      throw e;
    }
  }

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

  async createPatientProfile(input: PatientInput): Promise<Patient> {
    const created = await this.http.post<ApiPost<"/me/patient">>(
      "/me/patient",
      {
        id: crypto.randomUUID(),
        ...input,
      },
    );
    return { ...input, id: created.id };
  }

  async registerAsProvider(
    input: ProviderRegistrationInput,
  ): Promise<Provider> {
    const created = await this.http.post<ApiPost<"/providers/register">>(
      "/providers/register",
      {
        id: crypto.randomUUID(),
        clinicId: input.clinicId,
        firstName: input.firstName,
        lastName: input.lastName,
        specialty: input.specialty,
        fee: input.fee ?? undefined,
        gender: input.gender ?? undefined,
      },
    );
    return {
      id: created.id,
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

const isRole = (role: string): role is Role =>
  (ROLES as readonly string[]).includes(role);
