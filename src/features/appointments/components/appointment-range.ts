import {
  addMonths,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { addDays, localMidnightIso } from "@/lib/dates";

export type RangeMode = "day" | "week" | "month";

export type DateRange = {
  from: string;
  to: string;
  days: string[];
};

const MONDAY = { weekStartsOn: 1 } as const;
const toKey = (date: Date) => format(date, "yyyy-MM-dd");
const consecutiveDays = (start: string, count: number) =>
  Array.from({ length: count }, (_, i) => addDays(start, i));

export const monthKeyOf = (dateKey: string) => dateKey.slice(0, 7);

export const weekStartOf = (dateKey: string) =>
  toKey(startOfWeek(parseISO(dateKey), MONDAY));

export const weekDays = (dateKey: string) =>
  consecutiveDays(weekStartOf(dateKey), 7);

export const monthGridDays = (dateKey: string) =>
  consecutiveDays(weekStartOf(toKey(startOfMonth(parseISO(dateKey)))), 42);

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
  if (mode === "month")
    return toKey(startOfMonth(addMonths(parseISO(dateKey), steps)));
  return addDays(dateKey, steps * (mode === "week" ? 7 : 1));
}

export const monthLabel = (dateKey: string) =>
  parseISO(dateKey).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

export function weekLabel(dateKey: string): string {
  const days = weekDays(dateKey);
  const first = parseISO(days[0]);
  const last = parseISO(days[6]);
  const left = first.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const right = isSameMonth(first, last)
    ? String(last.getDate())
    : last.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${left} – ${right}, ${last.getFullYear()}`;
}

export const dayHeading = (dateKey: string) =>
  parseISO(dateKey).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
