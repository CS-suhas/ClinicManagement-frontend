import type { DoctorFilterValues } from "./doctor-filters";
import { FEE_RANGE } from "./doctor-filters";
import type { DoctorProfile } from "./doctor-profile";

const feeFilterActive = (fee: DoctorFilterValues["fee"]) =>
  fee[0] > FEE_RANGE.min || fee[1] < FEE_RANGE.max;

/**
 * The distinct specialties among `doctors`, sorted. Specialty is free text, so
 * entries differing only in case or surrounding spaces count as one.
 */
export function specialtyOptions(doctors: DoctorProfile[]): string[] {
  const byKey = new Map<string, string>();
  for (const s of doctors.flatMap((d) => d.specialties)) {
    const label = s.trim();
    const key = label.toLowerCase();
    if (label && !byKey.has(key)) byKey.set(key, label);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}

/**
 * Applies the sidebar filters and the search box. A doctor without the data a
 * filter needs (for example no fee) is hidden while that filter is active.
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
      filters.specialty &&
      !d.specialties.some(
        (s) => s.trim().toLowerCase() === filters.specialty.toLowerCase(),
      )
    )
      return false;
    if (
      feeFilterActive(filters.fee) &&
      (d.consultationFee === undefined ||
        d.consultationFee < filters.fee[0] ||
        d.consultationFee > filters.fee[1])
    )
      return false;
    return true;
  });
}
