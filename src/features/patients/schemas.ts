import { z } from "zod";
import type { Schemas } from "@/lib/api";

export type Patient = Schemas["PatientResponse"];
export type PatientListItem = Schemas["PatientListItemResponse"];
export type PatientAllergy = Schemas["PatientAllergyResponse"];
export type PatientVisit = Schemas["RosterVisit"];
export type AppointmentListItem = Schemas["AppointmentListResponse"];
export type PatientSummaryPatient = Schemas["PatientSummaryPatient"];
export type PatientSummaryAllergy = Schemas["PatientSummaryAllergy"];
export type PatientVisitCounts = Schemas["PatientVisitCounts"];
export type PatientRecentVisit = Schemas["PatientVisitResponse"];

export type PatientRow = {
  patient: PatientListItem;
  lastVisit?: PatientVisit | null;
  nextVisit?: PatientVisit | null;
  latestVisit?: { reasonForVisit: string | null } | null;
  provider?: { id: string; name: string; specialty: string };
};

export type PatientSummary = {
  patient: PatientSummaryPatient | null;
  allergies: PatientSummaryAllergy[] | null;
  lastVisit: PatientRecentVisit | null;
  nextVisit: PatientRecentVisit | null;
  counts: PatientVisitCounts | null;
  recent: PatientRecentVisit[] | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\-\s\d]{7,20}$/;
const filled = (value: string) => value.trim() !== "";

export const patientForm = z.object({
  firstName: z.string().refine(filled, "First name is required"),
  lastName: z.string().refine(filled, "Last name is required"),
  dateOfBirth: z
    .string()
    .refine(filled, "Date of birth is required")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date")
    .refine(
      (value) => !(new Date(value) > new Date()),
      "Date of birth cannot be in the future",
    ),
  email: z
    .string()
    .refine(filled, "Email is required")
    .refine((value) => EMAIL_RE.test(value.trim()), "Invalid email"),
  phoneNumber: z
    .string()
    .refine(filled, "Phone number is required")
    .refine((value) => PHONE_RE.test(value.trim()), "Invalid phone number"),
});
export type PatientForm = z.infer<typeof patientForm>;

export const patientDefaults: PatientForm = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  email: "",
  phoneNumber: "",
};

export const patientAllergyForm = z.object({
  allergyId: z.string().refine(filled, "Allergy is required"),
  severity: z.string().refine(filled, "Severity is required"),
  notes: z.string(),
});
export type PatientAllergyForm = z.infer<typeof patientAllergyForm>;

export const patientAllergyDefaults: PatientAllergyForm = {
  allergyId: "",
  severity: "",
  notes: "",
};
