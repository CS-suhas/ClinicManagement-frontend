import { formatDate } from "@/presentation/lib/format";

/** Whole years between a yyyy-mm-dd birth date and `now` (epoch ms); null when the date is unusable. */
export function ageInYears(dateOfBirth: string, now: number): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
  if (!match) return null;
  const birth = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  const today = new Date(now);
  let years = today.getFullYear() - birth.getFullYear();
  const birthdayReached =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() &&
      today.getDate() >= birth.getDate());
  if (!birthdayReached) years -= 1;
  return years >= 0 ? years : null;
}

export const formatTime = (iso: string) =>
  iso
    ? new Date(iso).toLocaleTimeString(undefined, { timeStyle: "short" })
    : "";

/** Date part of a visit or birth date. */
export const formatVisitDate = (iso: string) => formatDate(iso);

export const EMPTY_CELL = "—";
