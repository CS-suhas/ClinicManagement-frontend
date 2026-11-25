import {
  AllergyTypeService,
  AppointmentService,
  AuthService,
  ClinicJoinService,
  ClinicService,
  ConfigurationService,
  DashboardService,
  GlanceService,
  PatientAllergyService,
  PatientService,
  ProviderService,
  SearchService,
} from "@/application/services";
import type {
  AuthPersona,
  AuthRepository,
  CurrentUser,
  PublicAccess,
} from "@/domain/auth";
import type {
  AllergyTypeRepository,
  AppointmentAvailabilityRepository,
  AppointmentRepository,
  ClinicJoinRequestRepository,
  ClinicRepository,
  DashboardRepository,
  PatientAllergyRepository,
  PatientRepository,
  ProviderDirectoryRepository,
  ProviderRepository,
  ProviderRosterRepository,
  ProviderVerificationRepository,
  SummaryRepository,
} from "@/domain/repositories";
import { RuntimeConfigClient } from "@/infrastructure/config/runtime-config";
import { resolveApiBaseUrl } from "@/infrastructure/http/api-base-url";
import { type BaseUrl, HttpClient } from "@/infrastructure/http/http-client";
import { RestAuthRepository } from "@/infrastructure/http/rest-auth-repository";
import {
  RestAppointmentAvailabilityRepository,
  RestAppointmentRepository,
  RestClinicJoinRequestRepository,
  RestClinicRepository,
  RestConfigurationRepository,
  RestCrudRepository,
  RestDashboardRepository,
  RestPatientAllergyRepository,
  RestProviderDirectoryRepository,
  RestProviderRepository,
  RestProviderRosterRepository,
  RestProviderVerificationRepository,
} from "@/infrastructure/http/rest-repositories";
import { RestSummaryRepository } from "@/infrastructure/http/rest-summary-repository";
import { LocalStorageCollection } from "@/infrastructure/mock/local-storage-collection";
import { MockAppointmentAvailabilityRepository } from "@/infrastructure/mock/mock-appointment-availability";
import { MockAppointmentRepository } from "@/infrastructure/mock/mock-appointment-repository";
import {
  MOCK_PERSONAS,
  MockAuthRepository,
} from "@/infrastructure/mock/mock-auth-repository";
import { MockClinicJoinRequestRepository } from "@/infrastructure/mock/mock-clinic-join-repository";
import { MockClinicRepository } from "@/infrastructure/mock/mock-clinic-repository";
import {
  MOCK_APPOINTMENT_SETTINGS,
  MockConfigurationRepository,
} from "@/infrastructure/mock/mock-configuration-repository";
import { createMockDashboardRepository } from "@/infrastructure/mock/mock-dashboard-repository";
import {
  MockAllergyTypeRepository,
  MockPatientRepository,
} from "@/infrastructure/mock/mock-patient-repositories";
import {
  createMockProviderDirectoryRepository,
  MockProviderRepository,
  MockProviderVerificationRepository,
} from "@/infrastructure/mock/mock-provider-repository";
import { createMockProviderRosterRepository } from "@/infrastructure/mock/mock-provider-roster-repository";
import { MockPatientAllergyRepository } from "@/infrastructure/mock/mock-repositories";
import { createMockSummaryRepository } from "@/infrastructure/mock/mock-summary-repository";
import * as seed from "@/infrastructure/mock/seed";
import { OidcSession } from "@/infrastructure/oidc/oidc-session";

export type DataSource = "mock" | "rest";

export interface ContainerConfig {
  dataSource: DataSource;
  /** Usually `resolveApiBaseUrl`, so the URL is picked per request (browser vs. server). */
  apiBaseUrl: BaseUrl;
}

/** Everything the presentation layer is allowed to depend on. */
export interface Container {
  clinicService: ClinicService;
  providerService: ProviderService;
  patientService: PatientService;
  allergyTypeService: AllergyTypeService;
  patientAllergyService: PatientAllergyService;
  appointmentService: AppointmentService;
  clinicJoinService: ClinicJoinService;
  configurationService: ConfigurationService;
  dashboardService: DashboardService;
  authService: AuthService;
  /** Read models for the glance cards, filled from the server summaries. */
  glanceService: GlanceService;
  /** Global search for the command palette. */
  searchService: SearchService;
  /** Demo identities for the sign-in picker. Empty when sign-in is Keycloak-backed. */
  authPersonas: AuthPersona[];
  /** What anonymous visitors may open, from the runtime config (PUBLIC_DOCTORS). */
  getPublicAccess: () => Promise<PublicAccess>;
}

interface Repositories {
  dashboard: DashboardRepository;
  auth: AuthRepository;
  clinics: ClinicRepository;
  providers: ProviderRepository;
  providerDirectory: ProviderDirectoryRepository;
  providerVerification: ProviderVerificationRepository;
  patients: PatientRepository;
  allergyTypes: AllergyTypeRepository;
  patientAllergies: PatientAllergyRepository;
  appointments: AppointmentRepository;
  appointmentAvailability: AppointmentAvailabilityRepository;
  providerRoster: ProviderRosterRepository;
  clinicJoinRequests: ClinicJoinRequestRepository;
  summaries: SummaryRepository;
}

const STORAGE_PREFIX = "clinic-admin:";

function createMockRepositories(): Repositories {
  const col = <T>(key: string, data: T[]) =>
    new LocalStorageCollection<T>(STORAGE_PREFIX + key, data);
  // Stores are shared by every adapter that reads them, so the summaries see the same data.
  const clinicsStore = col("clinics", seed.seedClinics);
  // Versioned key: providers-v3 gives every seeded provider a clinic (pr4 had none).
  const providersStore = col("providers-v3", seed.seedProviders);
  const providers = new MockProviderRepository(providersStore);
  const clinics = new MockClinicRepository(clinicsStore, providers);
  const patientsStore = col("patients", seed.seedPatients);
  const patientAllergiesStore = col(
    "patient-allergies",
    seed.seedPatientAllergies,
  );
  const patients = new MockPatientRepository(
    patientsStore,
    patientAllergiesStore,
  );
  const allergyTypesStore = col("allergy-types", seed.seedAllergyTypes);
  const allergyTypes = new MockAllergyTypeRepository(
    allergyTypesStore,
    patientAllergiesStore,
  );
  const patientAllergies = new MockPatientAllergyRepository(
    patientAllergiesStore,
    allergyTypesStore,
  );
  const auth = new MockAuthRepository(patients, providersStore, clinicsStore);
  const currentUser = (): Promise<CurrentUser | null> => auth.getCurrentUser();
  // Versioned key: stored appointments from before statuses existed are not reused.
  const appointmentsStore = col("appointments-v2", seed.seedAppointments);
  const appointments = new MockAppointmentRepository(
    appointmentsStore,
    async () => {
      const [patientList, providerList, clinicList] = await Promise.all([
        patients.list(),
        providers.list(),
        clinics.list(),
      ]);
      return {
        patients: patientList,
        providers: providerList,
        clinics: clinicList,
        allergies: patientAllergiesStore.read(),
      };
    },
    currentUser,
    MOCK_APPOINTMENT_SETTINGS.appointmentDurationMinutes,
  );
  const providerRoster = createMockProviderRosterRepository(
    { patients, providers, appointments },
    currentUser,
  );
  // Versioned key: v2 seeds requests to move clinic, since pr4 now has one.
  const joinRequestsStore = col(
    "clinic-join-requests-v2",
    seed.seedClinicJoinRequests,
  );
  const clinicJoinRequests = new MockClinicJoinRequestRepository(
    joinRequestsStore,
    providersStore,
    clinics,
    currentUser,
  );
  return {
    dashboard: createMockDashboardRepository(
      {
        clinics,
        providers,
        patients,
        allergyTypes,
        appointments,
        allergies: { list: async () => patientAllergiesStore.read() },
        clinicJoinRequests,
      },
      () => auth.getCurrentUser(),
    ),
    auth,
    clinics,
    providers,
    providerDirectory: createMockProviderDirectoryRepository({
      providers,
      clinics,
    }),
    providerVerification: new MockProviderVerificationRepository(
      providersStore,
      currentUser,
    ),
    patients,
    allergyTypes,
    patientAllergies,
    appointments,
    appointmentAvailability: new MockAppointmentAvailabilityRepository(
      appointmentsStore,
    ),
    providerRoster,
    clinicJoinRequests,
    summaries: createMockSummaryRepository(
      {
        patients: { list: async () => patientsStore.read() },
        providers: { list: async () => providersStore.read() },
        clinics: { list: async () => clinicsStore.read() },
        appointments: { list: async () => appointmentsStore.read() },
        allergies: { list: async () => patientAllergiesStore.read() },
        allergyTypes: { list: async () => allergyTypesStore.read() },
        joinRequests: { list: async () => joinRequestsStore.read() },
        settings: MOCK_APPOINTMENT_SETTINGS,
      },
      currentUser,
    ),
  };
}

function createRestRepositories(
  baseUrl: BaseUrl,
  runtimeConfig: RuntimeConfigClient,
): Repositories {
  // The REST clients read their token from the auth repository on each request.
  const http: HttpClient = new HttpClient(baseUrl, () => auth.getAccessToken());
  const auth: RestAuthRepository = new RestAuthRepository(
    http,
    new OidcSession(() => runtimeConfig.keycloak()),
  );
  const clinics = new RestClinicRepository(http);
  const providers = new RestProviderRepository(http);
  return {
    dashboard: new RestDashboardRepository(http),
    auth,
    clinics,
    providers,
    providerDirectory: new RestProviderDirectoryRepository(http, clinics),
    providerVerification: new RestProviderVerificationRepository(http),
    patients: new RestCrudRepository(http, "/patients"),
    allergyTypes: new RestCrudRepository(http, "/allergy-types"),
    patientAllergies: new RestPatientAllergyRepository(http),
    appointments: new RestAppointmentRepository(http),
    appointmentAvailability: new RestAppointmentAvailabilityRepository(http),
    providerRoster: new RestProviderRosterRepository(http),
    clinicJoinRequests: new RestClinicJoinRequestRepository(http),
    summaries: new RestSummaryRepository(http),
  };
}

/** Composition root: the only place that knows concrete implementations. */
export function createContainer(config: ContainerConfig): Container {
  const isRest = config.dataSource === "rest";
  // Per-deployment settings, read by the browser at runtime from /runtime-config.
  const runtimeConfig = new RuntimeConfigClient();
  const r = isRest
    ? createRestRepositories(config.apiBaseUrl, runtimeConfig)
    : createMockRepositories();
  const getToken = (): Promise<string | null> => r.auth.getAccessToken();

  const clinicService = new ClinicService(r.clinics, r.providers);
  const providerService = new ProviderService(
    r.providers,
    r.appointments,
    r.providerDirectory,
    r.providerVerification,
  );
  const patientService = new PatientService(
    r.patients,
    r.appointments,
    r.patientAllergies,
    r.providerRoster,
  );
  const patientAllergyService = new PatientAllergyService(r.patientAllergies);
  const appointmentService = new AppointmentService(
    r.appointments,
    r.appointmentAvailability,
  );
  const clinicJoinService = new ClinicJoinService(r.clinicJoinRequests);
  const configurationService = new ConfigurationService(
    isRest
      ? new RestConfigurationRepository(
          new HttpClient(config.apiBaseUrl, getToken),
        )
      : new MockConfigurationRepository(),
  );

  return {
    clinicService,
    providerService,
    patientService,
    allergyTypeService: new AllergyTypeService(
      r.allergyTypes,
      r.patientAllergies,
    ),
    patientAllergyService,
    appointmentService,
    clinicJoinService,
    configurationService,
    dashboardService: new DashboardService(r.dashboard),
    authService: new AuthService(r.auth),
    glanceService: new GlanceService(
      {
        summaries: r.summaries,
        patients: patientService,
        patientAllergies: patientAllergyService,
        appointments: appointmentService,
        providers: providerService,
        configuration: configurationService,
      },
      () => r.auth.getCurrentUser(),
    ),
    searchService: new SearchService(r.summaries),
    authPersonas: isRest ? [] : MOCK_PERSONAS,
    getPublicAccess: () => runtimeConfig.publicAccess(),
  };
}

export function configFromEnv(): ContainerConfig {
  return {
    dataSource:
      process.env.NEXT_PUBLIC_DATA_SOURCE === "rest" ? "rest" : "mock",
    // Resolved at request time: "/api" in the browser, API_INTERNAL_URL on the server.
    apiBaseUrl: resolveApiBaseUrl,
  };
}
