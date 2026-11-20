import type {
  AllergyType,
  AllergyTypeInput,
  Appointment,
  AppointmentInput,
  Clinic,
  ClinicInput,
  Patient,
  PatientAllergy,
  PatientInput,
  Provider,
  ProviderInput,
} from "../entities";

/** Port: generic persistence contract for entities with a string id. */
export interface CrudRepository<T extends { id: string }, TInput> {
  list(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  create(input: TInput): Promise<T>;
  update(id: string, input: TInput): Promise<T>;
  delete(id: string): Promise<void>;
}

export type ClinicRepository = CrudRepository<Clinic, ClinicInput>;
export type ProviderRepository = CrudRepository<Provider, ProviderInput>;
export type PatientRepository = CrudRepository<Patient, PatientInput>;
export type AllergyTypeRepository = CrudRepository<
  AllergyType,
  AllergyTypeInput
>;
export type AppointmentRepository = CrudRepository<
  Appointment,
  AppointmentInput
>;

export interface PatientAllergyRepository {
  listByPatient(patientId: string): Promise<PatientAllergy[]>;
  listByAllergy(allergyId: string): Promise<PatientAllergy[]>;
  /** Creates or replaces the record identified by (patientId, allergyId). */
  save(record: PatientAllergy): Promise<PatientAllergy>;
  delete(patientId: string, allergyId: string): Promise<void>;
}

export interface ConfigurationRepository {
  getAllergySeverities(): Promise<unknown>;
  getAppointmentSettings(): Promise<unknown>;
}
