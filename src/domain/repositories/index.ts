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
  /** `id` lets callers pick the id up front, e.g. for optimistic UI. */
  create(input: TInput, id?: string): Promise<T>;
  update(id: string, input: TInput): Promise<T>;
  delete(id: string): Promise<void>;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface SearchOptions {
  search?: string;
  page: number;
  pageSize: number;
}

export interface ProviderSearchOptions extends SearchOptions {
  clinicId?: string;
}

export interface AppointmentSearchOptions extends SearchOptions {
  from?: string;
  to?: string;
  clinicId?: string;
  providerId?: string;
  patientId?: string;
}

export interface SearchRepository<
  T,
  TOptions extends SearchOptions = SearchOptions,
> {
  search(options: TOptions): Promise<PagedResult<T>>;
}

export interface AppointmentListItem extends Appointment {
  patientName: string;
  providerName: string;
  providerSpecialty: string;
  clinicId: string;
  clinicName: string;
}

export interface DashboardData {
  clinics: number;
  providers: number;
  patients: number;
  allergyTypes: number;
  appointments: number;
  upcomingAppointments: AppointmentListItem[];
}

export interface DashboardRepository {
  getDashboard(): Promise<DashboardData>;
}

export type ClinicRepository = CrudRepository<Clinic, ClinicInput> &
  SearchRepository<Clinic>;
export type ProviderRepository = CrudRepository<Provider, ProviderInput> &
  SearchRepository<Provider, ProviderSearchOptions>;
export type PatientRepository = CrudRepository<Patient, PatientInput> &
  SearchRepository<Patient>;
export type AllergyTypeRepository = CrudRepository<
  AllergyType,
  AllergyTypeInput
> &
  SearchRepository<AllergyType>;
export type AppointmentRepository = CrudRepository<
  Appointment,
  AppointmentInput
> &
  SearchRepository<AppointmentListItem, AppointmentSearchOptions>;

export interface PatientAllergyRepository {
  listByPatient(patientId: string): Promise<PatientAllergy[]>;
  searchByPatient(
    patientId: string,
    options: SearchOptions,
  ): Promise<PagedResult<PatientAllergy>>;
  allergyOptions(
    patientId: string,
    options: SearchOptions & { selectedAllergyId?: string },
  ): Promise<PagedResult<AllergyType>>;
  listByAllergy(allergyId: string): Promise<PatientAllergy[]>;
  add(record: PatientAllergy): Promise<PatientAllergy>;
  /** Creates or replaces the record identified by (patientId, allergyId). */
  save(record: PatientAllergy): Promise<PatientAllergy>;
  delete(patientId: string, allergyId: string): Promise<void>;
}

export interface ConfigurationRepository {
  getAllergySeverities(): Promise<unknown>;
  getAppointmentSettings(): Promise<unknown>;
}
