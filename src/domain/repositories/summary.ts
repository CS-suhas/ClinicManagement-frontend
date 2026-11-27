import type {
  AppointmentStatus,
  Clinic,
  Patient,
  Provider,
  Severity,
} from "../entities";
import type { VisitCounts } from "./glance";

/**
 * Server summaries: GET /patients/{id}/summary, /clinics/{id}/summary,
 * /providers/{id}/summary and /search. Field names follow the API contract.
 */

/** A visit in a patient summary. The patient is implied, so no patient fields. */
export type SummaryVisit = {
  id: string;
  appointmentDateTime: string;
  reasonForVisit: string | null;
  status: AppointmentStatus;
  providerName: string;
};

export type SummaryAllergy = {
  allergyId: string;
  name: string;
  severity: Severity;
};

export type PatientSummaryData = {
  patient: Patient;
  allergies: SummaryAllergy[];
  /** Latest past visit, ignoring DECLINED and CANCELLED. */
  lastVisit: SummaryVisit | null;
  /** Soonest upcoming visit, ignoring DECLINED and CANCELLED. */
  nextVisit: SummaryVisit | null;
  counts: VisitCounts;
  /** The latest three visits, any status, newest first. */
  recent: SummaryVisit[];
};

/** A provider with the name of its clinic (null when it has none). */
export type SummaryProvider = Provider & { clinicName: string | null };

export type ClinicSummaryData = {
  clinic: Clinic;
  /** Verified doctors at the clinic. */
  providerCount: number;
  /** Appointments today on the server's UTC day, excluding DECLINED and CANCELLED. */
  todayAppointmentCount: number;
  /** Up to three, most common first. */
  topSpecialties: string[];
  /** Up to five verified doctors. */
  providers: SummaryProvider[];
};

export type ProviderSummaryData = {
  provider: SummaryProvider;
  clinic: Clinic;
  /**
   * ISO UTC start of the next free slot within 14 days, or null. The server
   * evaluates clinic hours as UTC wall clock, so this is only a hint.
   */
  nextAvailableStart: string | null;
  todayAppointmentCount: number;
};

export type SearchPatientHit = {
  id: string;
  name: string;
  /** The patient's email. */
  subtitle: string;
};

export type SearchProviderHit = {
  id: string;
  name: string;
  specialty: string;
  /** Null when the API cannot resolve the clinic's name. */
  clinicName: string | null;
};

export type SearchClinicHit = {
  id: string;
  name: string;
  address: string | null;
};

export type SearchResults = {
  patients: SearchPatientHit[];
  providers: SearchProviderHit[];
  clinics: SearchClinicHit[];
};

/** Port: server-side summaries and global search. */
export type SummaryRepository = {
  /** 403 for a caller who may not see the patient; 404 for an unknown patient to an admin. */
  getPatientSummary(id: string): Promise<PatientSummaryData>;
  /** Signed in. 404 for an unknown clinic. */
  getClinicSummary(id: string): Promise<ClinicSummaryData>;
  /** Public. 404 unless the provider is VERIFIED. */
  getProviderSummary(id: string): Promise<ProviderSummaryData>;
  /** Signed in. `q` must be at least 2 characters (ValidationError on "q"); `limit` is 1-20. */
  search(q: string, limit: number): Promise<SearchResults>;
};
