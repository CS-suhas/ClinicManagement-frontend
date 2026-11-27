import {
  type AppointmentScope,
  addDays,
  localMidnightIso,
} from "@/application/services/appointment-service";
import type { AppointmentSearchOptions } from "@/domain/repositories";
import { toDateKey } from "./schedule-time";

export type RangeMode = "day" | "week" | "month";

export type DateRange = {
  from: string;
  to: string;
  days: string[];
};

const pad = (n: number) => String(n).padStart(2, "0");

export const monthKeyOf = (dateKey: string) => dateKey.slice(0, 7);

export function mondayIndex(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
}

export const weekStartOf = (dateKey: string) =>
  addDays(dateKey, -mondayIndex(dateKey));

export function weekDays(dateKey: string): string[] {
  const start = weekStartOf(dateKey);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function monthGridDays(dateKey: string): string[] {
  const first = `${monthKeyOf(dateKey)}-01`;
  const start = addDays(first, -mondayIndex(first));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function rangeFor(mode: RangeMode, dateKey: string): DateRange {
  const days =
    mode === "day"
      ? [dateKey]
      : mode === "week"
        ? weekDays(dateKey)
        : monthGridDays(dateKey);
  return {
    from: localMidnightIso(days[0]),
    to: localMidnightIso(addDays(days[days.length - 1], 1)),
    days,
  };
}

export function shiftDate(
  mode: RangeMode,
  dateKey: string,
  steps: number,
): string {
  if (mode === "month") {
    const [y, m] = dateKey.split("-").map(Number);
    const next = new Date(y, m - 1 + steps, 1);
    return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-01`;
  }
  return addDays(dateKey, steps * (mode === "week" ? 7 : 1));
}

export function monthLabel(dateKey: string): string {
  const [y, m] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function weekLabel(dateKey: string): string {
  const days = weekDays(dateKey);
  const first = new Date(...splitKey(days[0]));
  const last = new Date(...splitKey(days[6]));
  const left = first.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const right =
    first.getMonth() === last.getMonth()
      ? String(last.getDate())
      : last.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${left} – ${right}, ${last.getFullYear()}`;
}

function splitKey(dateKey: string): [number, number, number] {
  const [y, m, d] = dateKey.split("-").map(Number);
  return [y, m - 1, d];
}

export function dayHeading(dateKey: string): string {
  const [y, m, d] = splitKey(dateKey);
  return new Date(y, m, d).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function scopeFilter(
  scope: AppointmentScope,
): Pick<
  AppointmentSearchOptions,
  "clinicId" | "providerId" | "patientId"
> | null {
  switch (scope.mode) {
    case "all":
      return {};
    case "clinic":
      return { clinicId: scope.clinicId };
    case "provider":
      return { providerId: scope.providerId };
    case "patient":
      return { patientId: scope.patientId };
    case "none":
      return null;
  }
}

export const todayKeyOf = (ms: number) => toDateKey(ms);
