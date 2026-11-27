import { differenceInYears, isValid, parseISO } from "date-fns";

export function ageInYears(dateOfBirth: string, now: number): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return null;
  const birth = parseISO(dateOfBirth);
  if (!isValid(birth)) return null;
  const years = differenceInYears(now, birth);
  return years >= 0 ? years : null;
}
