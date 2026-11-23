import type { DoctorFilterValues } from "./doctor-filters";
import { FEE_RANGE } from "./doctor-filters";
import type { DoctorProfile } from "./doctor-profile";

const feeFilterActive = (fee: DoctorFilterValues["fee"]) =>
  fee[0] > FEE_RANGE.min || fee[1] < FEE_RANGE.max;

/**
 * Applies the sidebar filters and the search box. A doctor without the data a
 * filter needs (for example no fee) is hidden while that filter is active.
 * Availability is not applied: it needs per-doctor slots, not profile data.
 */
export function filterDoctors(
  doctors: DoctorProfile[],
  filters: DoctorFilterValues,
  query: string,
): DoctorProfile[] {
  const q = query.trim().toLowerCase();
  return doctors.filter((d) => {
    if (
      q &&
      ![d.name, d.clinicName, d.location ?? "", ...d.specialties].some(
        (field) => field.toLowerCase().includes(q),
      )
    )
      return false;
    if (filters.gender !== "all" && d.gender !== filters.gender) return false;
    if (
      filters.minExperience > 0 &&
      (d.experienceYears ?? 0) < filters.minExperience
    )
      return false;
    if (
      feeFilterActive(filters.fee) &&
      (d.consultationFee === undefined ||
        d.consultationFee < filters.fee[0] ||
        d.consultationFee > filters.fee[1])
    )
      return false;
    if (
      filters.consultTypes.length > 0 &&
      !filters.consultTypes.some((type) => d.consultTypes?.includes(type))
    )
      return false;
    return true;
  });
}
