import type {
  AppointmentStatus,
  Clinic,
  Patient,
  Provider,
  Severity,
} from "../entities";

export type AllergyEntry = {
  allergyId: string;
  name: string;
  severity: Severity;
};

export type VisitFact = {
  id: string;
  appointmentDateTime: string;
  reasonForVisit: string | null;
  patientId: string;
  patientName: string;
  providerId: string;
  providerName: string;
  status: AppointmentStatus;
};

export type VisitCounts = {
  total: number;
  requested: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  declined: number;
};

export type PatientSummary = {
  patient: Patient | null;
  allergies: AllergyEntry[] | null;
  lastVisit: VisitFact | null;
  nextVisit: VisitFact | null;
  counts: VisitCounts | null;
  recent: VisitFact[] | null;
};

export type ProviderSummary = {
  provider: Provider | null;
  clinic: Clinic | null;
  todayAppointmentCount: number | null;
  todaySlots: { busy: number; total: number } | null;
  nextAvailableStart: string | null;
  patientCount: number | null;
};

export type ClinicDoctorRef = {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
};

export type ClinicSummary = {
  clinic: Clinic | null;
  providerCount: number;
  providers: ClinicDoctorRef[];
  topSpecialties: string[];
  todayAppointmentCount: number | null;
};

export type ClinicDoctorPreview = {
  count: number;
  doctors: ClinicDoctorRef[];
};

export type AllergyUsage = {
  patientCount: number;
  patients: { id: string; name: string }[];
};
