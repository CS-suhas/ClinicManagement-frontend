import type { AuthRepository, CurrentUser, MeResponse } from "@/domain/auth";
import type {
  Patient,
  PatientInput,
  Provider,
  ProviderRegistrationInput,
} from "@/domain/entities";
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
      return {
        ...me,
        // Without a display name, the subject stands in.
        displayName: me.displayName ?? me.subject,
        clinicAdminOf: me.clinicAdminOf ?? [],
      };
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

  /** The API links the new patient to the caller. A second call returns 409. */
  async createPatientProfile(input: PatientInput): Promise<Patient> {
    const created = await this.http.post<{ id: string }>("/me/patient", {
      id: crypto.randomUUID(),
      ...input,
    });
    return { ...input, id: created.id };
  }

  /** The API links the new provider to the caller and returns 409 when they already have one. */
  async registerAsProvider(
    input: ProviderRegistrationInput,
  ): Promise<Provider> {
    const id = crypto.randomUUID();
    await this.http.post<unknown>("/providers/register", {
      id,
      firstName: input.firstName,
      lastName: input.lastName,
      specialty: input.specialty,
      fee: input.fee ?? undefined,
      gender: input.gender ?? undefined,
    });
    return {
      id,
      clinicId: "",
      firstName: input.firstName,
      lastName: input.lastName,
      specialty: input.specialty,
      fee: input.fee ?? null,
      gender: input.gender ?? null,
      verificationStatus: "PENDING",
    };
  }
}
