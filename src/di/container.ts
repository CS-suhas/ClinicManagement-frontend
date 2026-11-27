import {
  AllergyTypeService,
  AppointmentService,
  AuthService,
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
  AllergyType,
  AllergyTypeInput,
  Patient,
  PatientInput,
} from "@/domain/entities";
import type {
  AllergyTypeRepository,
  AppointmentAvailabilityRepository,
  AppointmentRepository,
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
import { resolveApiBaseUrl } from "@/infrastructure/http/api-base-url";
import type { Api } from "@/infrastructure/http/api-types";
import { type BaseUrl, HttpClient } from "@/infrastructure/http/http-client";
import { RestAuthRepository } from "@/infrastructure/http/rest-auth-repository";
import {
  passThrough,
  RestAppointmentAvailabilityRepository,
  RestAppointmentRepository,
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
import { session } from "@/lib/auth/session";
import { runtimeConfig } from "@/lib/runtime-config";

export type DataSource = "mock" | "rest";

export type ContainerConfig = {
  dataSource: DataSource;
  apiBaseUrl: BaseUrl;
};

export type Container = {
  clinicService: ClinicService;
  providerService: ProviderService;
  patientService: PatientService;
  allergyTypeService: AllergyTypeService;
  patientAllergyService: PatientAllergyService;
  appointmentService: AppointmentService;
  configurationService: ConfigurationService;
  dashboardService: DashboardService;
  authService: AuthService;
  glanceService: GlanceService;
  searchService: SearchService;
  authPersonas: AuthPersona[];
  getPublicAccess: () => Promise<PublicAccess>;
};

type Repositories = {
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
  summaries: SummaryRepository;
};

const STORAGE_PREFIX = "clinic-admin:";

function createMockRepositories(): Repositories {
  const col = <T>(key: string, data: T[]) =>
    new LocalStorageCollection<T>(STORAGE_PREFIX + key, data);
  const clinicsStore = col("clinics", seed.seedClinics);
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
    patientsStore,
  );
  const auth = new MockAuthRepository(patients, providersStore, clinicsStore);
  const currentUser = (): Promise<CurrentUser | null> => auth.getCurrentUser();
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
  return {
    dashboard: createMockDashboardRepository(
      {
        clinics,
        providers,
        patients,
        allergyTypes,
        appointments,
        allergies: { list: async () => patientAllergiesStore.read() },
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
    summaries: createMockSummaryRepository(
      {
        patients: { list: async () => patientsStore.read() },
        providers: { list: async () => providersStore.read() },
        clinics: { list: async () => clinicsStore.read() },
        appointments: { list: async () => appointmentsStore.read() },
        allergies: { list: async () => patientAllergiesStore.read() },
        allergyTypes: { list: async () => allergyTypesStore.read() },
        settings: MOCK_APPOINTMENT_SETTINGS,
      },
      currentUser,
    ),
  };
}

function createRestRepositories(baseUrl: BaseUrl): Repositories {
  const http: HttpClient = new HttpClient(baseUrl, () => auth.getAccessToken());
  const auth: RestAuthRepository = new RestAuthRepository(http, session);
  const clinics = new RestClinicRepository(http);
  const providers = new RestProviderRepository(http);
  return {
    dashboard: new RestDashboardRepository(http),
    auth,
    clinics,
    providers,
    providerDirectory: new RestProviderDirectoryRepository(http, clinics),
    providerVerification: new RestProviderVerificationRepository(http),
    patients: new RestCrudRepository(
      http,
      "/patients",
      passThrough<Patient, PatientInput, Api<"PatientResponse">>(),
    ),
    allergyTypes: new RestCrudRepository(
      http,
      "/allergy-types",
      passThrough<AllergyType, AllergyTypeInput, Api<"AllergyTypeResponse">>(),
    ),
    patientAllergies: new RestPatientAllergyRepository(http),
    appointments: new RestAppointmentRepository(http),
    appointmentAvailability: new RestAppointmentAvailabilityRepository(http),
    providerRoster: new RestProviderRosterRepository(http),
    summaries: new RestSummaryRepository(http),
  };
}

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
    dataSource: "rest",
    apiBaseUrl: resolveApiBaseUrl,
  };
}
