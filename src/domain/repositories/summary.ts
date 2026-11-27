import type {
  AppointmentStatus,
  Clinic,
  Patient,
  Provider,
  Severity,
} from "../entities";
import type { VisitCounts } from "./glance";

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
  lastVisit: SummaryVisit | null;
  nextVisit: SummaryVisit | null;
  counts: VisitCounts;
  recent: SummaryVisit[];
};

export type SummaryProvider = Provider & { clinicName: string | null };

export type ClinicSummaryData = {
  clinic: Clinic;
  providerCount: number;
  todayAppointmentCount: number;
  topSpecialties: string[];
  providers: SummaryProvider[];
};

export type ProviderSummaryData = {
  provider: SummaryProvider;
  clinic: Clinic;
  nextAvailableStart: string | null;
  todayAppointmentCount: number;
};

export type SearchPatientHit = {
  id: string;
  name: string;
  subtitle: string;
};

export type SearchProviderHit = {
  id: string;
  name: string;
  specialty: string;
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

export type SummaryRepository = {
  getPatientSummary(id: string): Promise<PatientSummaryData>;
  getClinicSummary(id: string): Promise<ClinicSummaryData>;
  getProviderSummary(id: string): Promise<ProviderSummaryData>;
  search(q: string, limit: number): Promise<SearchResults>;
};
