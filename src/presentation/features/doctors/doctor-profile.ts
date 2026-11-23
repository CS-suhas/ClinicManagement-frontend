import {
  type Clinic,
  type Provider,
  type ProviderGender,
  providerFullName,
} from "@/domain/entities";

const GENDER_KEYS: Record<ProviderGender, Lowercase<ProviderGender>> = {
  MALE: "male",
  FEMALE: "female",
  OTHER: "other",
};

/**
 * What the doctors page shows. Only the first block comes from the API today;
 * the optional fields are shown when a doctor has them and hidden otherwise.
 */
export interface DoctorProfile {
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
  consultTypes?: string[];
}

export function toDoctorProfile(
  provider: Provider,
  clinic: Clinic | undefined,
): DoctorProfile {
  return {
    id: provider.id,
    name: `Dr. ${providerFullName(provider)}`,
    specialties: [provider.specialty],
    clinicId: provider.clinicId,
    clinicName: clinic?.name ?? "",
    location: clinic?.location ?? null,
    phone: clinic?.phoneNumber || null,
    consultationFee: provider.fee ?? undefined,
    gender: provider.gender ? GENDER_KEYS[provider.gender] : undefined,
  };
}
