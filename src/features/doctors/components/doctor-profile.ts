import type { ProviderGender } from "@/features/providers/schemas";
import { providerFullName } from "@/features/providers/utils";
import type { Clinic, ProviderDirectoryEntry } from "../schemas";

const GENDER_KEYS = {
  MALE: "male",
  FEMALE: "female",
  OTHER: "other",
} as const satisfies Record<ProviderGender, string>;

export type DoctorProfile = {
  id: string;
  name: string;
  specialties: string[];
  clinicId: string;
  clinicName: string;
  location: string | null;
  phone: string | null;
  qualifications?: string;
  rating?: number;
  experienceYears?: number;
  consultationFee?: number;
  gender?: (typeof GENDER_KEYS)[keyof typeof GENDER_KEYS];
};

export function toDoctorProfile(
  provider: ProviderDirectoryEntry,
  clinic: Clinic | undefined,
): DoctorProfile {
  return {
    id: provider.id,
    name: `Dr. ${providerFullName(provider)}`,
    specialties: [provider.specialty],
    clinicId: provider.clinicId,
    clinicName: provider.clinicName ?? clinic?.name ?? "",
    location: clinic?.address ?? null,
    phone: clinic?.phoneNumber || null,
    consultationFee: provider.fee ?? undefined,
    gender: provider.gender ? GENDER_KEYS[provider.gender] : undefined,
  };
}
