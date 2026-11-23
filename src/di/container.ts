import {
  AllergyTypeService,
  AppointmentService,
  AuthService,
  ClinicJoinService,
  ClinicService,
  ConfigurationService,
  DashboardService,
  PatientAllergyService,
  PatientService,
  ProviderService,
} from "@/application/services";
import type { AuthPersona, AuthRepository, CurrentUser } from "@/domain/auth";
import type {
  AllergyType,
  AllergyTypeInput,
  Clinic,
  ClinicInput,
  Patient,
  PatientInput,
} from "@/domain/entities";
import type {
  AllergyTypeRepository,
  AppointmentAvailabilityRepository,
  AppointmentRepository,
  ClinicJoinRequestRepository,
  ClinicRepository,
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
  /** Demo identities for the sign-in picker. Empty when sign-in is Keycloak-backed. */
  authPersonas: AuthPersona[];
}

interface Repositories {
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
  const patients = new MockCrudRepository<Patient, PatientInput>(
    col("patients", seed.seedPatients),
    "Patient",
  );
  const allergyTypesStore = col("allergy-types", seed.seedAllergyTypes);
  const allergyTypes = new MockCrudRepository<AllergyType, AllergyTypeInput>(
    allergyTypesStore,
    "Allergy type",
  );
  const patientAllergies = new MockPatientAllergyRepository(
    col("patient-allergies", seed.seedPatientAllergies),
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

  return {
    clinicService: new ClinicService(r.clinics, r.providers),
    providerService: new ProviderService(
      r.providers,
      r.appointments,
      r.providerDirectory,
      r.providerVerification,
    ),
    patientService: new PatientService(
      r.patients,
      r.appointments,
      r.patientAllergies,
      r.providerRoster,
    ),
    allergyTypeService: new AllergyTypeService(
      r.allergyTypes,
      r.patientAllergies,
    ),
    patientAllergyService: new PatientAllergyService(r.patientAllergies),
    appointmentService: new AppointmentService(
      r.appointments,
      r.appointmentAvailability,
    ),
    clinicJoinService: new ClinicJoinService(r.clinicJoinRequests),
    configurationService: new ConfigurationService(
      isRest
        ? // Served by the Next.js rewrites in next.config.ts, hence no base URL.
          new RestConfigurationRepository(new HttpClient("", getToken))
        : new MockConfigurationRepository(),
    ),
    dashboardService: new DashboardService(
      isRest
        ? new RestDashboardRepository(
            new HttpClient(config.apiBaseUrl, getToken),
          )
        : createMockDashboardRepository(r, () => r.auth.getCurrentUser()),
    ),
    authService: new AuthService(r.auth),
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
