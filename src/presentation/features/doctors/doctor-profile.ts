import {
  type Clinic,
  type Provider,
  providerFullName,
} from "@/domain/entities";

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
  gender?: "male" | "female";
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
  };
}
