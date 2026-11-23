import {
  AllergyTypeService,
  AppointmentService,
  AuthService,
  ClinicService,
  ConfigurationService,
  DashboardService,
  PatientAllergyService,
  PatientService,
  ProviderService,
} from "@/application/services";
import type { AuthPersona, AuthRepository } from "@/domain/auth";
import type {
  AllergyType,
  AllergyTypeInput,
  Clinic,
  ClinicInput,
  Patient,
  PatientInput,
  Provider,
  ProviderInput,
} from "@/domain/entities";
import type {
  AllergyTypeRepository,
  AppointmentRepository,
  ClinicRepository,
  PatientAllergyRepository,
  PatientRepository,
  ProviderRepository,
} from "@/domain/repositories";
import { HttpClient } from "@/infrastructure/http/http-client";
import { RestAuthRepository } from "@/infrastructure/http/rest-auth-repository";
import {
  RestAppointmentRepository,
  RestClinicRepository,
  RestConfigurationRepository,
  RestCrudRepository,
  RestDashboardRepository,
  RestPatientAllergyRepository,
  RestProviderRepository,
} from "@/infrastructure/http/rest-repositories";
import { LocalStorageCollection } from "@/infrastructure/mock/local-storage-collection";
import {
  MOCK_PERSONAS,
  MockAuthRepository,
} from "@/infrastructure/mock/mock-auth-repository";
import { MockConfigurationRepository } from "@/infrastructure/mock/mock-configuration-repository";
import { createMockDashboardRepository } from "@/infrastructure/mock/mock-dashboard-repository";
import {
  MockAppointmentRepository,
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
  configurationService: ConfigurationService;
  dashboardService: DashboardService;
  authService: AuthService;
  /** Demo identities for the sign-in picker. Empty when sign-in is Keycloak-backed. */
  authPersonas: AuthPersona[];
}

interface Repositories {
  clinics: ClinicRepository;
  providers: ProviderRepository;
  patients: PatientRepository;
  allergyTypes: AllergyTypeRepository;
  patientAllergies: PatientAllergyRepository;
  appointments: AppointmentRepository;
}

const STORAGE_PREFIX = "clinic-admin:";

function createMockRepositories(): Repositories {
  const col = <T>(key: string, data: T[]) =>
    new LocalStorageCollection<T>(STORAGE_PREFIX + key, data);
  const clinics = new MockCrudRepository<Clinic, ClinicInput>(
    col("clinics", seed.seedClinics),
    "Clinic",
  );
  const providers = new MockCrudRepository<Provider, ProviderInput>(
    col("providers", seed.seedProviders),
    "Provider",
  );
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
  const appointments = new MockAppointmentRepository(
    col("appointments", seed.seedAppointments),
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
  );
  return {
    clinics,
    providers,
    patients,
    allergyTypes,
    patientAllergies,
    appointments,
  };
}

function createRestRepositories(
  baseUrl: string,
  getToken: () => Promise<string | null>,
): Repositories {
  const http = new HttpClient(baseUrl, getToken);
  return {
    clinics: new RestClinicRepository(http),
    providers: new RestProviderRepository(http),
    patients: new RestCrudRepository(http, "/patients"),
    allergyTypes: new RestCrudRepository(http, "/allergy-types"),
    patientAllergies: new RestPatientAllergyRepository(http),
    appointments: new RestAppointmentRepository(http),
  };
}

/** Composition root: the only place that knows concrete implementations. */
export function createContainer(config: ContainerConfig): Container {
  const isRest = config.dataSource === "rest";
  // The REST clients read their token from the auth repository on each request.
  const getToken = (): Promise<string | null> =>
    authRepository.getAccessToken();
  const authRepository: AuthRepository = isRest
    ? new RestAuthRepository(new HttpClient(config.apiBaseUrl, getToken))
    : new MockAuthRepository();
  const r = isRest
    ? createRestRepositories(config.apiBaseUrl, getToken)
    : createMockRepositories();

  return {
    clinicService: new ClinicService(r.clinics, r.providers),
    providerService: new ProviderService(r.providers, r.appointments),
    patientService: new PatientService(
      r.patients,
      r.appointments,
      r.patientAllergies,
    ),
    allergyTypeService: new AllergyTypeService(
      r.allergyTypes,
      r.patientAllergies,
    ),
    patientAllergyService: new PatientAllergyService(r.patientAllergies),
    appointmentService: new AppointmentService(r.appointments),
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
        : createMockDashboardRepository(r),
    ),
    authService: new AuthService(authRepository),
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
