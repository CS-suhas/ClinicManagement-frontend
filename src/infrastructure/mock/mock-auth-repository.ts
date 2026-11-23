import type { AuthPersona, AuthRepository, CurrentUser } from "@/domain/auth";
import type { Patient, PatientInput } from "@/domain/entities";
import { ConflictError, UnauthorizedError } from "@/domain/errors";
import type { PatientRepository } from "@/domain/repositories";
import { delay } from "./local-storage-collection";

const STORAGE_KEY = "clinic-admin:auth-persona";
/** Patient profiles created through onboarding, keyed by persona id. */
const PATIENT_LINKS_KEY = "clinic-admin:auth-patient-links";
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
  {
    id: "new-user",
    label: "New user",
    description:
      "No roles and no patient record. Create one through onboarding. Signing in again clears it.",
    user: {
      subject: "mock-new-user",
      displayName: "Jordan Lee",
      roles: [],
      patient: null,
      provider: null,
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

/** persona id -> patient id, for profiles created through onboarding. */
function readPatientLinks(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(PATIENT_LINKS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writePatientLinks(links: Record<string, string>): void {
  try {
    window.localStorage.setItem(PATIENT_LINKS_KEY, JSON.stringify(links));
  } catch {
    // storage unavailable: the link lasts for this page load only
  }
}

/** The persona's user, with the patient profile it created through onboarding. */
function currentUserFor(persona: AuthPersona): CurrentUser {
  const user = structuredClone(persona.user);
  const patientId: string | undefined = readPatientLinks()[persona.id];
  if (!patientId || user.patient) return user;
  return {
    ...user,
    roles: user.roles.includes("patient")
      ? user.roles
      : [...user.roles, "patient"],
    patient: { id: patientId },
  };
}

/** Mock session: the chosen persona id is kept in localStorage. */
export class MockAuthRepository implements AuthRepository {
  /** Patient profiles live in the same store the patients pages use. */
  constructor(private readonly patients: PatientRepository) {}

  async getCurrentUser(): Promise<CurrentUser | null> {
    await delay();
    const persona = findPersona(readPersonaId());
    return persona ? currentUserFor(persona) : null;
  }

  async signIn(personaId: string = DEFAULT_PERSONA_ID): Promise<CurrentUser> {
    await delay();
    const persona = findPersona(personaId);
    if (!persona) throw new Error(`Unknown mock persona "${personaId}"`);
    // Signing in again drops this persona's onboarding link, so its patient
    // profile can be created again. Seeded patient links are not affected.
    writePatientLinks(
      Object.fromEntries(
        Object.entries(readPatientLinks()).filter(([id]) => id !== persona.id),
      ),
    );
    writePersonaId(persona.id);
    return currentUserFor(persona);
  }

  /** Creates the patient in the patients store and links it to the current persona. */
  async createPatientProfile(input: PatientInput): Promise<Patient> {
    await delay();
    const persona = findPersona(readPersonaId());
    if (!persona) throw new UnauthorizedError();
    if (currentUserFor(persona).patient)
      throw new ConflictError("This account already has a patient profile.");
    const patient = await this.patients.create(input);
    writePatientLinks({ ...readPatientLinks(), [persona.id]: patient.id });
    return patient;
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
