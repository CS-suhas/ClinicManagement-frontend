import {
  type Clinic,
  type ProviderGender,
  providerFullName,
} from "@/domain/entities";
import type { ProviderDirectoryEntry } from "@/domain/repositories";

const GENDER_KEYS: Record<ProviderGender, Lowercase<ProviderGender>> = {
  MALE: "male",
  FEMALE: "female",
  OTHER: "other",
};

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
  gender?: Lowercase<ProviderGender>;
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
    location: clinic?.location ?? null,
    phone: clinic?.phoneNumber || null,
    consultationFee: provider.fee ?? undefined,
    gender: provider.gender ? GENDER_KEYS[provider.gender] : undefined,
  };
}
