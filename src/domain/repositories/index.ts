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

/** Port: generic persistence contract for entities with a string id. */
export type CrudRepository<T extends { id: string }, TInput> = {
  list(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  /** `id` lets callers pick the id up front, e.g. for optimistic UI. */
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
};

export type SearchRepository<
  T,
  TOptions extends SearchOptions = SearchOptions,
> = {
  search(options: TOptions): Promise<PagedResult<T>>;
};

/** An appointment as the list endpoints return it, with names and clinic joined in. */
export type AppointmentListItem = Omit<Appointment, "reasonForVisit"> & {
  patientName: string;
  providerName: string;
  providerSpecialty: string;
  clinicId: string;
  clinicName: string;
  reasonForVisit: string | null;
  /** Allergies recorded on the patient. Optional for older responses. */
  patientAllergyCount?: number;
  /** Highest recorded severity of the patient, or null. Optional for older responses. */
  patientHighestAllergySeverity?: string | null;
};

/** Port: status transitions. Each one throws ConflictError on an invalid transition and ForbiddenError for the wrong caller. */
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
  /** REQUESTED appointments starting now or later. Optional for older responses. */
  pendingRequestCount?: number;
};

/** A recent decision on one of the patient's requests. Uses the CURRENT status, so a later change drops it. */
export type RecentDecision = {
  appointmentId: string;
  status: "CONFIRMED" | "DECLINED";
  decidedAtUtc: string | null;
  providerName: string;
};

export type PatientDashboard = {
  nextAppointment: AppointmentListItem | null;
  upcomingAppointmentCount: number;
  /** Up to five, newest first. Optional for older responses. */
  recentDecisions?: RecentDecision[];
};

/** Response of GET /api/me/dashboard. A section is null unless the caller holds that role (and, for doctor and patient, the linked record). */
export type MeDashboard = {
  admin: AdminDashboard | null;
  clinicAdmin: ClinicAdminDashboard | null;
  doctor: DoctorDashboard | null;
  patient: PatientDashboard | null;
};

export type DashboardRepository = {
  getDashboard(): Promise<DashboardData>;
  /** The signed-in user's dashboard, one section per role. */
  getMine(): Promise<MeDashboard>;
};

/** The visit facts a provider's roster shows for one patient. */
export type PatientVisitSummary = {
  id: string;
  appointmentDateTime: string;
  reasonForVisit: string | null;
};

/** One line of a provider's patient roster. Visit facts count only that provider's appointments. */
export type PatientRosterRow = {
  patient: PatientListItem;
  /** Latest past appointment, ignoring DECLINED and CANCELLED. */
  lastVisit: PatientVisitSummary | null;
  /** Soonest upcoming appointment, ignoring DECLINED and CANCELLED. */
  nextVisit: PatientVisitSummary | null;
  /** Every appointment with this provider, whatever its status. */
  appointmentCount: number;
};

/** Port: the patients a provider has appointments with, paged and ordered by last name, first name. */
export type ProviderRosterRepository = {
  searchProviderRoster(
    providerId: string,
    options: SearchOptions,
  ): Promise<PagedResult<PatientRosterRow>>;
};

export type ProviderDirectoryOptions = SearchOptions & {
  clinicId?: string;
};

/** A directory row: the provider and the name of its clinic, null when unknown. */
export type ProviderDirectoryEntry = Provider & { clinicName: string | null };

/**
 * Port: the public list of bookable doctors, i.e. verified providers.
 * `search` matches first name, last name, specialty or clinic name.
 */
export type ProviderDirectoryRepository = {
  list(
    options: ProviderDirectoryOptions,
  ): Promise<PagedResult<ProviderDirectoryEntry>>;
};

export type VerificationSearchOptions = SearchOptions & {
  /** Non-admins are always limited to VERIFIED, whatever is passed. */
  verificationStatus?: VerificationStatus;
};

/**
 * Port: doctor verification. Admins act on any doctor, clinic admins on doctors
 * at a clinic they administer; each action throws ConflictError on an invalid
 * transition.
 */
export type ProviderVerificationRepository = {
  searchByStatus(
    options: VerificationSearchOptions,
  ): Promise<PagedResult<Provider>>;
  /** Every doctor at the clinic for admins and its clinic admins; verified ones only for anyone else. */
  listByClinic(clinicId: string): Promise<Provider[]>;
  /** From PENDING or REJECTED. Throws ConflictError when already VERIFIED. */
  verify(id: string): Promise<void>;
  /** From PENDING only. Throws ConflictError otherwise. */
  reject(id: string): Promise<void>;
};

/** Port: busy slots for one doctor on one local day. Public, and carries no patient data. */
export type AppointmentAvailabilityRepository = {
  /** `date` is "YYYY-MM-DD". Resolves to the ISO start times of REQUESTED and CONFIRMED appointments that day. */
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
  /** The patients who have this allergy recorded (GET /allergy-types/:id/patients). */
  listPatientsByAllergy(allergyId: string): Promise<Patient[]>;
  add(record: PatientAllergy): Promise<PatientAllergy>;
  /** Creates or replaces the record identified by (patientId, allergyId). */
  save(record: PatientAllergy): Promise<PatientAllergy>;
  delete(patientId: string, allergyId: string): Promise<void>;
};

export type ConfigurationRepository = {
  getAllergySeverities(): Promise<unknown>;
  getAppointmentSettings(): Promise<unknown>;
};
