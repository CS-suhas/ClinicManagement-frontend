import type { AuthPersona, AuthRepository, CurrentUser } from "@/domain/auth";
import { delay } from "./local-storage-collection";

const STORAGE_KEY = "clinic-admin:auth-persona";
const DEFAULT_PERSONA_ID = "admin";

/**
 * Demo identities for mock mode. Patient and provider IDs point at records in
 * seed.ts so the signed-in user's linked data shows up in the app.
 */
export const MOCK_PERSONAS: AuthPersona[] = [
  {
    id: "admin",
    label: "Admin",
    description: "Full access to every management page.",
    user: {
      subject: "mock-admin",
      displayName: "Alex Admin",
      roles: ["admin"],
      patient: null,
      provider: null,
    },
  },
  {
    id: "clinicadmin",
    label: "Clinic admin",
    description: "Manages clinics and sees the dashboard and appointments.",
    user: {
      subject: "mock-clinicadmin",
      displayName: "Casey Clinic",
      roles: ["clinicadmin"],
      patient: null,
      provider: null,
    },
  },
  {
    id: "doctor",
    label: "Doctor",
    description: "Verified provider with a linked doctor profile.",
    user: {
      subject: "mock-doctor",
      displayName: "Alice Moreno",
      roles: ["doctor"],
      patient: null,
      provider: { id: "pr1", verificationStatus: "VERIFIED" },
    },
  },
  {
    id: "pending-doctor",
    label: "Pending doctor",
    description:
      "Registered provider awaiting verification. Has no doctor role yet.",
    user: {
      subject: "mock-pending-doctor",
      displayName: "Chen Li",
      roles: [],
      patient: null,
      provider: { id: "pr3", verificationStatus: "PENDING" },
    },
  },
  {
    id: "patient",
    label: "Patient",
    description: "Patient with a linked record and appointments.",
    user: {
      subject: "mock-patient",
      displayName: "Dana Fischer",
      roles: ["patient"],
      patient: { id: "p1" },
      provider: null,
    },
  },
  {
    id: "patient-doctor",
    label: "Patient and doctor",
    description: "Holds both the patient and doctor roles.",
    user: {
      subject: "mock-patient-doctor",
      displayName: "Ben Okafor",
      roles: ["patient", "doctor"],
      patient: { id: "p2" },
      provider: { id: "pr2", verificationStatus: "VERIFIED" },
    },
  },
];

function readPersonaId(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writePersonaId(id: string | null): void {
  try {
    if (id === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // storage unavailable: the session lasts for this page load only
  }
}

function findPersona(id: string | null): AuthPersona | undefined {
  return MOCK_PERSONAS.find((persona) => persona.id === id);
}

/** Mock session: the chosen persona id is kept in localStorage. */
export class MockAuthRepository implements AuthRepository {
  async getCurrentUser(): Promise<CurrentUser | null> {
    await delay();
    const persona = findPersona(readPersonaId());
    return persona ? structuredClone(persona.user) : null;
  }

  async signIn(personaId: string = DEFAULT_PERSONA_ID): Promise<CurrentUser> {
    await delay();
    const persona = findPersona(personaId);
    if (!persona) throw new Error(`Unknown mock persona "${personaId}"`);
    writePersonaId(persona.id);
    return structuredClone(persona.user);
  }

  async signOut(): Promise<void> {
    await delay();
    writePersonaId(null);
  }

  /** Not delayed: the HTTP client asks for a token on every request. */
  async getAccessToken(): Promise<string | null> {
    const persona = findPersona(readPersonaId());
    return persona ? `mock-token-${persona.id}` : null;
  }
}
