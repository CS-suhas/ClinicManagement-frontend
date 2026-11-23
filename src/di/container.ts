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
} from "@/application/services";
import type { AuthPersona, AuthRepository, CurrentUser } from "@/domain/auth";
import type { Clinic, ClinicInput } from "@/domain/entities";
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
} from "@/domain/repositories";
import { HttpClient } from "@/infrastructure/http/http-client";
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
import { LocalStorageCollection } from "@/infrastructure/mock/local-storage-collection";
import { MockAppointmentAvailabilityRepository } from "@/infrastructure/mock/mock-appointment-availability";
import { MockAppointmentRepository } from "@/infrastructure/mock/mock-appointment-repository";
import {
  MOCK_PERSONAS,
  MockAuthRepository,
} from "@/infrastructure/mock/mock-auth-repository";
import { MockClinicJoinRequestRepository } from "@/infrastructure/mock/mock-clinic-join-repository";
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
import {
  MockCrudRepository,
  MockPatientAllergyRepository,
} from "@/infrastructure/mock/mock-repositories";
import * as seed from "@/infrastructure/mock/seed";

export type DataSource = "mock" | "rest";

export interface ContainerConfig {
  dataSource: DataSource;
  apiBaseUrl: string;
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
  /** Read models for the glance cards, composed from the services above. */
  glanceService: GlanceService;
  /** Demo identities for the sign-in picker. Empty when sign-in is Keycloak-backed. */
  authPersonas: AuthPersona[];
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
}

const STORAGE_PREFIX = "clinic-admin:";

function createMockRepositories(): Repositories {
  const col = <T>(key: string, data: T[]) =>
    new LocalStorageCollection<T>(STORAGE_PREFIX + key, data);
  const clinics = new MockCrudRepository<Clinic, ClinicInput>(
    col("clinics", seed.seedClinics),
    "Clinic",
  );
  // Versioned key: providers-v2 adds the seeded pr4 and the verification fields.
  // One store instance is shared by every adapter that reads or writes providers.
  const providersStore = col("providers-v2", seed.seedProviders);
  const providers = new MockProviderRepository(providersStore);
  const patientAllergiesStore = col(
    "patient-allergies",
    seed.seedPatientAllergies,
  );
  const patients = new MockPatientRepository(
    col("patients", seed.seedPatients),
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
  const auth = new MockAuthRepository(patients, providersStore);
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
  const clinicJoinRequests = new MockClinicJoinRequestRepository(
    col("clinic-join-requests", seed.seedClinicJoinRequests),
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
  };
}

function createRestRepositories(baseUrl: string): Repositories {
  // The REST clients read their token from the auth repository on each request.
  const http: HttpClient = new HttpClient(baseUrl, () => auth.getAccessToken());
  const auth: RestAuthRepository = new RestAuthRepository(http);
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
  };
}

/** Composition root: the only place that knows concrete implementations. */
export function createContainer(config: ContainerConfig): Container {
  const isRest = config.dataSource === "rest";
  const r = isRest
    ? createRestRepositories(config.apiBaseUrl)
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
      ? // Served by the Next.js rewrites in next.config.ts, hence no base URL.
        new RestConfigurationRepository(new HttpClient("", getToken))
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
        patients: patientService,
        patientAllergies: patientAllergyService,
        appointments: appointmentService,
        providers: providerService,
        clinics: clinicService,
        clinicJoins: clinicJoinService,
        configuration: configurationService,
      },
      () => r.auth.getCurrentUser(),
    ),
    authPersonas: isRest ? [] : MOCK_PERSONAS,
  };
}

export function configFromEnv(): ContainerConfig {
  return {
    dataSource:
      process.env.NEXT_PUBLIC_DATA_SOURCE === "rest" ? "rest" : "mock",
    apiBaseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api",
  };
}
