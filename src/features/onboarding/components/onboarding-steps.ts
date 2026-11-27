import { needsOnboarding } from "@/application/auth/permissions";
import type { CurrentUser } from "@/domain/auth";
import type { PatientInput, ProviderGender } from "@/domain/entities";

/** What the user says they are, on the first step. */
export type OnboardingChoice = "patient" | "doctor";

/**
 * Where the user is in onboarding. Derived from the signed-in user, so a
 * refresh after each mutation moves the flow on by itself.
 */
export type OnboardingStep = "role" | "patient" | "doctor" | "status" | "done";

/**
 * The step to show. A doctor application comes first, because it decides what
 * the user sees next; then the user's own choice on the role step.
 */
export function resolveStep(
  user: CurrentUser,
  choice: OnboardingChoice | null,
): OnboardingStep {
  const provider = user.provider;
  if (
    provider &&
    (provider.verificationStatus === "PENDING" ||
      provider.verificationStatus === "REJECTED")
  )
    return "status";
  if (!needsOnboarding(user)) return "done";
  if (choice === "doctor") return "doctor";
  if (choice === "patient") return "patient";
  return "role";
}

/** The step labels for the stepper, shaped by the path the user is on. */
export function stepLabels(
  step: OnboardingStep,
  path: OnboardingChoice | null,
): { labels: string[]; current: number } {
  if (path === "doctor" || step === "status") {
    const labels = ["Your role", "Your details", "Approval"];
    const current = step === "role" ? 0 : step === "doctor" ? 1 : 2;
    return { labels, current };
  }
  const labels = ["Your role", "Your details", "Done"];
  const current = step === "role" ? 0 : step === "patient" ? 1 : 2;
  return { labels, current };
}

/** First word becomes the first name; the rest becomes the last name. */
export function splitDisplayName(displayName: string): {
  firstName: string;
  lastName: string;
} {
  const [firstName = "", ...rest] = displayName.trim().split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
}

export const EMPTY_PATIENT_DETAILS: PatientInput = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  phoneNumber: "",
  email: "",
};

/** The patient form's starting values: the display name split into first and last. */
export function patientDefaults(user: CurrentUser | null): PatientInput {
  return {
    ...EMPTY_PATIENT_DETAILS,
    ...splitDisplayName(user?.displayName ?? ""),
  };
}

/** The doctor form keeps the fee as typed text until it is submitted. */
export type DoctorDetails = {
  /** The clinic the doctor practises at; "" until one is picked. */
  clinicId: string;
  /** The picked clinic's name, so the picker can show it after the search changes. */
  clinicName: string;
  firstName: string;
  lastName: string;
  specialty: string;
  fee: string;
  /** "NONE" means the doctor prefers not to say. */
  gender: ProviderGender | "NONE";
};

export function doctorDefaults(user: CurrentUser | null): DoctorDetails {
  return {
    clinicId: "",
    clinicName: "",
    ...splitDisplayName(user?.displayName ?? ""),
    specialty: "",
    fee: "",
    gender: "NONE",
  };
}

/** Common specialties offered as suggestions; any text is accepted. */
export const COMMON_SPECIALTIES = [
  "General practice",
  "Cardiology",
  "Dermatology",
  "Endocrinology",
  "ENT",
  "Gynaecology",
  "Neurology",
  "Ophthalmology",
  "Orthopaedics",
  "Paediatrics",
  "Psychiatry",
  "Dentistry",
];

/** Where onboarding sends the user when they are done. Never back into onboarding. */
export function destinationAfter(next: string): string {
  return next.startsWith("/onboarding") ? "/dashboard" : next;
}
