import { formatDate } from "@/lib/format";

export { ageInYears } from "@/lib/age";

export const formatTime = (iso: string) =>
  iso
    ? new Date(iso).toLocaleTimeString(undefined, { timeStyle: "short" })
    : "";

/** Date part of a visit or birth date. */
export const formatVisitDate = (iso: string) => formatDate(iso);

export const EMPTY_CELL = "—";
