import type { CurrentUser } from "@/domain/auth";
import type { PatientInput, ProviderGender } from "@/domain/entities";
import { needsOnboarding } from "@/features/auth/permissions";

export type OnboardingChoice = "patient" | "doctor";

export type OnboardingStep = "role" | "patient" | "doctor" | "status" | "done";

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

export function patientDefaults(user: CurrentUser | null): PatientInput {
  return {
    ...EMPTY_PATIENT_DETAILS,
    ...splitDisplayName(user?.displayName ?? ""),
  };
}

export type DoctorDetails = {
  clinicId: string;
  clinicName: string;
  firstName: string;
  lastName: string;
  specialty: string;
  fee: string;
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

export function destinationAfter(next: string): string {
  return next.startsWith("/onboarding") ? "/dashboard" : next;
}
