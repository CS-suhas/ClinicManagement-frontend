import type {
  AuthPersona,
  AuthRepository,
  CurrentUser,
  Role,
} from "@/domain/auth";
import type {
  Patient,
  PatientInput,
  Provider,
  ProviderRegistrationInput,
} from "@/domain/entities";
import { ConflictError, UnauthorizedError } from "@/domain/errors";
import type { PatientRepository } from "@/domain/repositories";
import { delay, type LocalStorageCollection } from "./local-storage-collection";
import { newId } from "./mock-repositories";

const STORAGE_KEY = "clinic-admin:auth-persona";
/** Patient profiles created through onboarding, keyed by persona id. */
const PATIENT_LINKS_KEY = "clinic-admin:auth-patient-links";
/** Provider records created through self-registration, keyed by persona id. */
const PROVIDER_LINKS_KEY = "clinic-admin:auth-provider-links";
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
      clinicAdminOf: [],
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
      clinicAdminOf: ["c1"],
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
      clinicAdminOf: [],
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
      clinicAdminOf: [],
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
      clinicAdminOf: [],
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
      clinicAdminOf: [],
    },
  },
  {
    id: "new-user",
    label: "New user",
    description:
      "No roles and no patient record. Create one through onboarding, or register as a doctor. Signing in again clears both.",
    user: {
      subject: "mock-new-user",
      displayName: "Jordan Lee",
      roles: [],
      patient: null,
      provider: null,
      clinicAdminOf: [],
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

/** A persona-id -> record-id map, kept in localStorage under `key`. */
function readLinks(key: string): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeLinks(key: string, links: Record<string, string>): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(links));
  } catch {
    // storage unavailable: the link lasts for this page load only
  }
}

/** Drops one persona's link, so its onboarding can run again. Seeded links are kept. */
function unlink(key: string, personaId: string): void {
  writeLinks(
    key,
    Object.fromEntries(
      Object.entries(readLinks(key)).filter(([id]) => id !== personaId),
    ),
  );
}

/**
 * The persona's user as the API would report it right now: linked patient and
 * provider records applied, and the doctor role derived from the provider's
 * verification status. Called on every read, so verification takes effect at once.
 */
function currentUserFor(
  persona: AuthPersona,
  providers: Provider[],
): CurrentUser {
  const user = structuredClone(persona.user);

  const patientId: string | undefined =
    readLinks(PATIENT_LINKS_KEY)[persona.id];
  if (patientId && !user.patient) {
    user.patient = { id: patientId };
    if (!user.roles.includes("patient")) user.roles.push("patient");
  }

  const providerId =
    user.provider?.id ?? readLinks(PROVIDER_LINKS_KEY)[persona.id];
  const provider = providerId
    ? providers.find((item) => item.id === providerId)
    : undefined;
  user.provider = provider
    ? {
        id: provider.id,
        verificationStatus: provider.verificationStatus ?? "PENDING",
        clinicId: provider.clinicId || null,
      }
    : null;

  // The doctor role exists only while the linked provider is verified.
  const roles: Role[] = user.roles.filter((role) => role !== "doctor");
  if (user.provider?.verificationStatus === "VERIFIED") roles.push("doctor");
  user.roles = roles;
  return user;
}

/** Mock session: the chosen persona id is kept in localStorage. */
export class MockAuthRepository implements AuthRepository {
  /**
   * Patient profiles live in the patients store. Provider records live in the
   * providers store, which the provider pages share.
   */
  constructor(
    private readonly patients: PatientRepository,
    private readonly providers: LocalStorageCollection<Provider>,
  ) {}

  async getCurrentUser(): Promise<CurrentUser | null> {
    await delay();
    const persona = findPersona(readPersonaId());
    return persona ? currentUserFor(persona, this.providers.read()) : null;
  }

  async signIn(personaId: string = DEFAULT_PERSONA_ID): Promise<CurrentUser> {
    await delay();
    const persona = findPersona(personaId);
    if (!persona) throw new Error(`Unknown mock persona "${personaId}"`);
    // Signing in again drops this persona's onboarding links, so its patient
    // profile and provider registration can be made again. Seeded links are not affected.
    unlink(PATIENT_LINKS_KEY, persona.id);
    unlink(PROVIDER_LINKS_KEY, persona.id);
    writePersonaId(persona.id);
    return currentUserFor(persona, this.providers.read());
  }

  /** Creates the patient in the patients store and links it to the current persona. */
  async createPatientProfile(input: PatientInput): Promise<Patient> {
    await delay();
    const persona = findPersona(readPersonaId());
    if (!persona) throw new UnauthorizedError();
    if (currentUserFor(persona, this.providers.read()).patient)
      throw new ConflictError("This account already has a patient profile.");
    const patient = await this.patients.create(input);
    writeLinks(PATIENT_LINKS_KEY, {
      ...readLinks(PATIENT_LINKS_KEY),
      [persona.id]: patient.id,
    });
    return patient;
  }

  /**
   * Creates a PENDING provider with no clinic and links it to the current persona.
   * A persona that already has a provider (including a rejected one) gets a 409.
   */
  async registerAsProvider(
    input: ProviderRegistrationInput,
  ): Promise<Provider> {
    await delay();
    const persona = findPersona(readPersonaId());
    if (!persona) throw new UnauthorizedError();
    if (currentUserFor(persona, this.providers.read()).provider)
      throw new ConflictError("This account is already linked to a provider.");
    const provider: Provider = {
      id: newId(),
      clinicId: "",
      firstName: input.firstName,
      lastName: input.lastName,
      specialty: input.specialty,
      fee: input.fee ?? null,
      gender: input.gender ?? null,
      verificationStatus: "PENDING",
    };
    this.providers.write([...this.providers.read(), provider]);
    writeLinks(PROVIDER_LINKS_KEY, {
      ...readLinks(PROVIDER_LINKS_KEY),
      [persona.id]: provider.id,
    });
    return provider;
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
