import {
  AllergyTypeService,
  AppointmentService,
  ClinicService,
  ConfigurationService,
  DashboardService,
  PatientAllergyService,
  PatientService,
  ProviderService,
} from "@/application/services";
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
  DashboardRepository,
  PatientAllergyRepository,
  PatientRepository,
  ProviderRepository,
} from "@/domain/repositories";
import { HttpClient } from "@/infrastructure/http/http-client";
import {
  RestAppointmentRepository,
  RestClinicRepository,
  RestConfigurationRepository,
  RestCrudRepository,
  RestDashboardRepository,
  RestPatientAllergyRepository,
} from "@/infrastructure/http/rest-repositories";
import { LocalStorageCollection } from "@/infrastructure/mock/local-storage-collection";
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

function createRestRepositories(baseUrl: string): Repositories {
  const http = new HttpClient(baseUrl);
  return {
    clinics: new RestClinicRepository(http),
    providers: new RestCrudRepository(http, "/providers"),
    patients: new RestCrudRepository(http, "/patients"),
    allergyTypes: new RestCrudRepository(http, "/allergy-types"),
    patientAllergies: new RestPatientAllergyRepository(http),
    appointments: new RestAppointmentRepository(http),
  };
}

function createMockDashboardRepository(
  repositories: Repositories,
): DashboardRepository {
  return {
    async getDashboard() {
      const [clinics, providers, patients, allergyTypes, appointments] =
        await Promise.all([
          repositories.clinics.list(),
          repositories.providers.list(),
          repositories.patients.list(),
          repositories.allergyTypes.list(),
          repositories.appointments.list(),
        ]);
      const patientById = new Map(patients.map((item) => [item.id, item]));
      const providerById = new Map(providers.map((item) => [item.id, item]));
      const clinicById = new Map(clinics.map((item) => [item.id, item]));
      const upcomingAppointments = appointments
        .filter((item) => Date.parse(item.appointmentDateTime) >= Date.now())
        .sort((a, b) =>
          a.appointmentDateTime.localeCompare(b.appointmentDateTime),
        )
        .slice(0, 5)
        .map((item) => {
          const provider = providerById.get(item.providerId);
          const patient = patientById.get(item.patientId);
          const clinic = provider ? clinicById.get(provider.clinicId) : null;
          return {
            ...item,
            patientName: patient
              ? `${patient.firstName} ${patient.lastName}`.trim()
              : "",
            providerName: provider
              ? `${provider.firstName} ${provider.lastName}`.trim()
              : "",
            providerSpecialty: provider?.specialty ?? "",
            clinicId: provider?.clinicId ?? "",
            clinicName: clinic?.name ?? "",
          };
        });
      return {
        clinics: clinics.length,
        providers: providers.length,
        patients: patients.length,
        allergyTypes: allergyTypes.length,
        appointments: appointments.length,
        upcomingAppointments,
      };
    },
  };
}

/** Composition root: the only place that knows concrete implementations. */
export function createContainer(config: ContainerConfig): Container {
  const r =
    config.dataSource === "rest"
      ? createRestRepositories(config.apiBaseUrl)
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
      new RestConfigurationRepository(new HttpClient("")),
    ),
    dashboardService: new DashboardService(
      config.dataSource === "rest"
        ? new RestDashboardRepository(new HttpClient(config.apiBaseUrl))
        : createMockDashboardRepository(r),
    ),
  };
}

export function configFromEnv(): ContainerConfig {
  return {
    dataSource:
      process.env.NEXT_PUBLIC_DATA_SOURCE === "rest" ? "rest" : "mock",
    apiBaseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api",
  };
}
