import type {
  AppointmentStatus,
  Clinic,
  Patient,
  Provider,
  Severity,
} from "../entities";

/**
 * Read models behind the glance cards (hover/tap previews). They are composed
 * client-side by GlanceService from existing endpoints today; a summary
 * endpoint can replace each method later without changing these shapes.
 */

/** One allergy on a patient, as the glance shows it. */
export interface AllergyEntry {
  allergyId: string;
  name: string;
  severity: Severity;
}

/** A visit as a glance shows it. Built from the appointment list, so names are included. */
export interface VisitFact {
  id: string;
  appointmentDateTime: string;
  reasonForVisit: string | null;
  patientId: string;
  patientName: string;
  providerId: string;
  providerName: string;
  status: AppointmentStatus;
}

export interface VisitCounts {
  total: number;
  requested: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  declined: number;
}

export interface PatientSummary {
  /** Null when the caller may not read the patient record (the card keeps its seed name). */
  patient: Patient | null;
  /** Null when the caller may not read allergies. An empty array means none recorded. */
  allergies: AllergyEntry[] | null;
  /** Latest past visit, ignoring DECLINED and CANCELLED. */
  lastVisit: VisitFact | null;
  /** Soonest upcoming visit, ignoring DECLINED and CANCELLED. */
  nextVisit: VisitFact | null;
  /** Null when the caller may not see the patient's appointments. */
  counts: VisitCounts | null;
  /** The latest three visits, any status, newest first. Null when hidden. */
  recent: VisitFact[] | null;
}

export interface ProviderSummary {
  /** Null when the provider record is not readable by the caller. */
  provider: Provider | null;
  /** Null when the doctor has no clinic or the clinic is not readable. */
  clinic: Clinic | null;
  /** Appointments today. Null unless the caller sees the doctor's full schedule. */
  todayAppointmentCount: number | null;
  /** Slots today: busy start count and total slots within clinic hours. Null when settings or busy slots are unavailable. */
  todaySlots: { busy: number; total: number } | null;
  /** ISO start of the next free slot in the next week, or null when none or unknown. */
  nextAvailableStart: string | null;
  /** Distinct patients. Null unless the caller is an admin, the doctor, or a clinic admin of the clinic. */
  patientCount: number | null;
}

export interface ClinicDoctorRef {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
}

export interface ClinicSummary {
  /** Null when the clinic is not readable by the caller. */
  clinic: Clinic | null;
  /** Verified doctors at the clinic (the public directory count). */
  providerCount: number;
  /** Up to five doctors, for avatars. */
  providers: ClinicDoctorRef[];
  /** Up to three specialties with their counts, most common first. */
  topSpecialties: { specialty: string; count: number }[];
  /** Appointments today at the clinic. Null unless the caller is an admin or a clinic admin of it. */
  todayAppointmentCount: number | null;
  /** Pending join requests. Null unless the caller is an admin or a clinic admin of it. */
  pendingJoinRequestCount: number | null;
}

/** Doctors per clinic for list tables, from one directory read. */
export interface ClinicDoctorPreview {
  count: number;
  doctors: ClinicDoctorRef[];
}

/** One allergy's usage across patients, for the allergy glance and expansion. */
export interface AllergyUsage {
  patientCount: number;
  /** Count per severity, keyed by the stored severity value. */
  severityCounts: Record<string, number>;
  /** Up to ten affected patients; names are omitted when the caller cannot read them. */
  patients: { id: string; name: string | null }[];
}
