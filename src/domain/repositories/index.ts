export type { AuthRepository } from "../auth";

import type { VerificationStatus } from "../auth";
import type {
  AllergyType,
  AllergyTypeInput,
  Appointment,
  AppointmentInput,
  AppointmentStatus,
  Clinic,
  ClinicInput,
  ClinicJoinRequest,
  ClinicJoinStatus,
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
  /** Inclusive ISO date-time. Must be strictly before `to`. */
  from?: string;
  /** Exclusive ISO date-time. */
  to?: string;
  clinicId?: string;
  providerId?: string;
  /** Up to 100. An empty array matches nothing. */
  providerIds?: string[];
  patientId?: string;
  status?: AppointmentStatus;
}

export interface SearchRepository<
  T,
  TOptions extends SearchOptions = SearchOptions,
> {
  search(options: TOptions): Promise<PagedResult<T>>;
}

/** An appointment as the list endpoints return it, with names and clinic joined in. */
export interface AppointmentListItem
  extends Omit<Appointment, "reasonForVisit"> {
  patientName: string;
  providerName: string;
  providerSpecialty: string;
  clinicId: string;
  clinicName: string;
  reasonForVisit: string | null;
}

/** Port: status transitions. Each one throws ConflictError on an invalid transition and ForbiddenError for the wrong caller. */
export interface AppointmentActionRepository {
  confirm(id: string): Promise<void>;
  decline(id: string): Promise<void>;
  complete(id: string): Promise<void>;
  cancel(id: string): Promise<void>;
}

export interface DashboardData {
  clinics: number;
  providers: number;
  patients: number;
  allergyTypes: number;
  appointments: number;
  upcomingAppointments: AppointmentListItem[];
}

export interface AdminDashboard {
  clinicCount: number;
  providerCount: number;
  patientCount: number;
  pendingProviderVerificationCount: number;
  todayAppointmentCount: number;
}

export interface ClinicAdminDashboard extends AdminDashboard {
  pendingJoinRequestCount: number;
}

export interface DoctorDashboard {
  todayAppointmentCount: number;
  weekAppointmentCount: number;
  distinctPatientCount: number;
  nextAppointment: AppointmentListItem | null;
}

export interface PatientDashboard {
  nextAppointment: AppointmentListItem | null;
  upcomingAppointmentCount: number;
}

/** Response of GET /api/me/dashboard. A section is null unless the caller holds that role (and, for doctor and patient, the linked record). */
export interface MeDashboard {
  admin: AdminDashboard | null;
  clinicAdmin: ClinicAdminDashboard | null;
  doctor: DoctorDashboard | null;
  patient: PatientDashboard | null;
}

export interface DashboardRepository {
  getDashboard(): Promise<DashboardData>;
  /** The signed-in user's dashboard, one section per role. */
  getMine(): Promise<MeDashboard>;
}

/** The visit facts a provider's roster shows for one patient. */
export interface PatientVisitSummary {
  id: string;
  appointmentDateTime: string;
  reasonForVisit: string | null;
}

/** One line of a provider's patient roster. Visit facts count only that provider's appointments. */
export interface PatientRosterRow {
  patient: Patient;
  /** Latest past appointment, ignoring DECLINED and CANCELLED. */
  lastVisit: PatientVisitSummary | null;
  /** Soonest upcoming appointment, ignoring DECLINED and CANCELLED. */
  nextVisit: PatientVisitSummary | null;
  /** Every appointment with this provider, whatever its status. */
  appointmentCount: number;
}

/** Port: the patients a provider has appointments with, paged and ordered by last name, first name. */
export interface ProviderRosterRepository {
  searchProviderRoster(
    providerId: string,
    options: SearchOptions,
  ): Promise<PagedResult<PatientRosterRow>>;
}

export interface ProviderDirectoryOptions extends SearchOptions {
  clinicId?: string;
}

/** A directory row: the provider and the name of its clinic, null when unknown. */
export type ProviderDirectoryEntry = Provider & { clinicName: string | null };

/**
 * Port: the public list of bookable doctors, i.e. verified providers that
 * belong to a clinic. `search` matches first name, last name, specialty or clinic name.
 */
export interface ProviderDirectoryRepository {
  list(
    options: ProviderDirectoryOptions,
  ): Promise<PagedResult<ProviderDirectoryEntry>>;
}

export interface VerificationSearchOptions extends SearchOptions {
  /** Non-admins are always limited to VERIFIED, whatever is passed. */
  verificationStatus?: VerificationStatus;
}

/** Port: doctor verification. Admin only; each action throws ConflictError on an invalid transition. */
export interface ProviderVerificationRepository {
  searchByStatus(
    options: VerificationSearchOptions,
  ): Promise<PagedResult<Provider>>;
  /** From PENDING or REJECTED. Throws ConflictError when already VERIFIED. */
  verify(id: string): Promise<void>;
  /** From PENDING only. Throws ConflictError otherwise. */
  reject(id: string): Promise<void>;
}

/** Port: busy slots for one doctor on one local day. Public, and carries no patient data. */
export interface AppointmentAvailabilityRepository {
  /** `date` is "YYYY-MM-DD". Resolves to the ISO start times of REQUESTED and CONFIRMED appointments that day. */
  getBusyStarts(providerId: string, date: string): Promise<string[]>;
}

/** Port: a doctor's requests to join a clinic. */
export interface ClinicJoinRequestRepository {
  /** Throws ConflictError when the doctor already has a clinic or a PENDING request. */
  createForProvider(
    providerId: string,
    clinicId: string,
  ): Promise<{ id: string }>;
  /** Newest first. */
  listForProvider(providerId: string): Promise<ClinicJoinRequest[]>;
  /** Clinic admins of that clinic, and admins. Newest first. */
  listForClinic(
    clinicId: string,
    status?: ClinicJoinStatus,
  ): Promise<ClinicJoinRequest[]>;
  /** Clinic admins of the request's clinic, and admins. Also sets the provider's clinic. */
  approve(id: string): Promise<void>;
  reject(id: string): Promise<void>;
  /** Only by the requesting doctor, and only while PENDING. */
  cancel(id: string): Promise<void>;
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
  SearchRepository<AppointmentListItem, AppointmentSearchOptions> &
  AppointmentActionRepository;

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
