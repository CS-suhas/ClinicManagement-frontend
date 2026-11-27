export type { AuthRepository } from "../auth";
export * from "./summary";

import type { VerificationStatus } from "../auth";
import type {
  AllergyType,
  AllergyTypeInput,
  Appointment,
  AppointmentInput,
  AppointmentStatus,
  Clinic,
  ClinicInput,
  Patient,
  PatientAllergy,
  PatientInput,
  PatientListItem,
  Provider,
  ProviderInput,
} from "../entities";

export type CrudRepository<T extends { id: string }, TInput> = {
  list(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  create(input: TInput, id?: string): Promise<T>;
  update(id: string, input: TInput): Promise<T>;
  delete(id: string): Promise<void>;
};

export type PagedResult<T> = {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type SearchOptions = {
  search?: string;
  page: number;
  pageSize: number;
};

export type ProviderSearchOptions = SearchOptions & {
  clinicId?: string;
};

export type AppointmentSearchOptions = SearchOptions & {
  from?: string;
  to?: string;
  clinicId?: string;
  providerId?: string;
  providerIds?: string[];
  patientId?: string;
  status?: AppointmentStatus;
};

export type SearchRepository<
  T,
  TOptions extends SearchOptions = SearchOptions,
> = {
  search(options: TOptions): Promise<PagedResult<T>>;
};

export type AppointmentListItem = Omit<Appointment, "reasonForVisit"> & {
  patientName: string;
  providerName: string;
  providerSpecialty: string;
  clinicId: string;
  clinicName: string;
  reasonForVisit: string | null;
  patientAllergyCount?: number;
  patientHighestAllergySeverity?: string | null;
};

export type AppointmentActionRepository = {
  confirm(id: string): Promise<void>;
  decline(id: string): Promise<void>;
  complete(id: string): Promise<void>;
  cancel(id: string): Promise<void>;
};

export type DashboardData = {
  clinics: number;
  providers: number;
  patients: number;
  allergyTypes: number;
  appointments: number;
  upcomingAppointments: AppointmentListItem[];
};

export type AdminDashboard = {
  clinicCount: number;
  providerCount: number;
  patientCount: number;
  pendingProviderVerificationCount: number;
  todayAppointmentCount: number;
};

export type ClinicAdminDashboard = AdminDashboard;

export type DoctorDashboard = {
  todayAppointmentCount: number;
  weekAppointmentCount: number;
  distinctPatientCount: number;
  nextAppointment: AppointmentListItem | null;
  pendingRequestCount?: number;
};

export type RecentDecision = {
  appointmentId: string;
  status: "CONFIRMED" | "DECLINED";
  decidedAtUtc: string | null;
  providerName: string;
};

export type PatientDashboard = {
  nextAppointment: AppointmentListItem | null;
  upcomingAppointmentCount: number;
  recentDecisions?: RecentDecision[];
};

export type MeDashboard = {
  admin: AdminDashboard | null;
  clinicAdmin: ClinicAdminDashboard | null;
  doctor: DoctorDashboard | null;
  patient: PatientDashboard | null;
};

export type DashboardRepository = {
  getDashboard(): Promise<DashboardData>;
  getMine(): Promise<MeDashboard>;
};

export type PatientVisitSummary = {
  id: string;
  appointmentDateTime: string;
  reasonForVisit: string | null;
};

export type PatientRosterRow = {
  patient: PatientListItem;
  lastVisit: PatientVisitSummary | null;
  nextVisit: PatientVisitSummary | null;
  appointmentCount: number;
};

export type ProviderRosterRepository = {
  searchProviderRoster(
    providerId: string,
    options: SearchOptions,
  ): Promise<PagedResult<PatientRosterRow>>;
};

export type ProviderDirectoryOptions = SearchOptions & {
  clinicId?: string;
};

export type ProviderDirectoryEntry = Provider & { clinicName: string | null };

export type ProviderDirectoryRepository = {
  list(
    options: ProviderDirectoryOptions,
  ): Promise<PagedResult<ProviderDirectoryEntry>>;
};

export type VerificationSearchOptions = SearchOptions & {
  verificationStatus?: VerificationStatus;
};

export type ProviderVerificationRepository = {
  searchByStatus(
    options: VerificationSearchOptions,
  ): Promise<PagedResult<Provider>>;
  listByClinic(clinicId: string): Promise<Provider[]>;
  verify(id: string): Promise<void>;
  reject(id: string): Promise<void>;
};

export type AppointmentAvailabilityRepository = {
  getBusyStarts(providerId: string, date: string): Promise<string[]>;
};

export type ClinicRepository = CrudRepository<Clinic, ClinicInput> &
  SearchRepository<Clinic>;
export type ProviderRepository = CrudRepository<Provider, ProviderInput> &
  SearchRepository<Provider, ProviderSearchOptions>;
export type PatientRepository = CrudRepository<Patient, PatientInput> &
  SearchRepository<PatientListItem>;
export type AllergyTypeRepository = CrudRepository<
  AllergyType,
  AllergyTypeInput
> &
  SearchRepository<AllergyType>;
export type AppointmentRepository = CrudRepository<
  Appointment,
  AppointmentInput
> &
  SearchRepository<AppointmentListItem, AppointmentSearchOptions> &
  AppointmentActionRepository;

export type PatientAllergyRepository = {
  listByPatient(patientId: string): Promise<PatientAllergy[]>;
  searchByPatient(
    patientId: string,
    options: SearchOptions,
  ): Promise<PagedResult<PatientAllergy>>;
  allergyOptions(
    patientId: string,
    options: SearchOptions & { selectedAllergyId?: string },
  ): Promise<PagedResult<AllergyType>>;
  listPatientsByAllergy(allergyId: string): Promise<Patient[]>;
  add(record: PatientAllergy): Promise<PatientAllergy>;
  save(record: PatientAllergy): Promise<PatientAllergy>;
  delete(patientId: string, allergyId: string): Promise<void>;
};

export type ConfigurationRepository = {
  getAllergySeverities(): Promise<unknown>;
  getAppointmentSettings(): Promise<unknown>;
};
