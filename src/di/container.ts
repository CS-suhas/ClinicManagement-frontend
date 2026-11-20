import {
  AllergyTypeService,
  AppointmentService,
  ClinicService,
  ConfigurationService,
  PatientAllergyService,
  PatientService,
  ProviderService,
} from "@/application/services";
import type {
  AllergyType,
  AllergyTypeInput,
  Appointment,
  AppointmentInput,
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
import {
  RestClinicRepository,
  RestConfigurationRepository,
  RestCrudRepository,
  RestPatientAllergyRepository,
} from "@/infrastructure/http/rest-repositories";
import { LocalStorageCollection } from "@/infrastructure/mock/local-storage-collection";
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
  configurationService: ConfigurationService;
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
  return {
    clinics: new MockCrudRepository<Clinic, ClinicInput>(
      col("clinics", seed.seedClinics),
      "Clinic",
    ),
    providers: new MockCrudRepository<Provider, ProviderInput>(
      col("providers", seed.seedProviders),
      "Provider",
    ),
    patients: new MockCrudRepository<Patient, PatientInput>(
      col("patients", seed.seedPatients),
      "Patient",
    ),
    allergyTypes: new MockCrudRepository<AllergyType, AllergyTypeInput>(
      col("allergy-types", seed.seedAllergyTypes),
      "Allergy type",
    ),
    patientAllergies: new MockPatientAllergyRepository(
      col("patient-allergies", seed.seedPatientAllergies),
    ),
    appointments: new MockCrudRepository<Appointment, AppointmentInput>(
      col("appointments", seed.seedAppointments),
      "Appointment",
    ),
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
    appointments: new RestCrudRepository(http, "/appointments"),
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
  };
}

export function configFromEnv(): ContainerConfig {
  return {
    dataSource:
      process.env.NEXT_PUBLIC_DATA_SOURCE === "rest" ? "rest" : "mock",
    apiBaseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api",
  };
}
