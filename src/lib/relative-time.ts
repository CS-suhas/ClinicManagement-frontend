import { isSameDay } from "date-fns";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const timeFormat = new Intl.DateTimeFormat(undefined, { timeStyle: "short" });
const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const absoluteFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

export function formatAbsolute(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : absoluteFormat.format(date);
}

export function formatRelative(iso: string, now: number): string {
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return "";
  const current = new Date(now);
  const diff = target.getTime() - now;
  const time = timeFormat.format(target);

  if (Math.abs(diff) < HOUR) {
    const minutes = Math.round(diff / MINUTE);
    if (minutes === 0) return "now";
    return diff > 0 ? `in ${minutes} min` : `${-minutes} min ago`;
  }
  if (isSameDay(target, current)) return `today ${time}`;
  if (Math.abs(diff) < 7 * DAY)
    return `${weekdayFormat.format(target)} ${time}`;
  return dateFormat.format(target);
}

export function formatSpan(iso: string, now: number): string {
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return "";
  const diff = target.getTime() - now;
  const abs = Math.abs(diff);
  if (abs < HOUR) return formatRelative(iso, now);
  if (abs < DAY) return rtf.format(Math.round(diff / HOUR), "hour");
  if (abs < 14 * DAY) return rtf.format(Math.round(diff / DAY), "day");
  if (abs < 60 * DAY) return rtf.format(Math.round(diff / (7 * DAY)), "week");
  if (abs < 365 * DAY)
    return rtf.format(Math.round(diff / (30 * DAY)), "month");
  return dateFormat.format(target);
}

export function startsSoon(iso: string, now: number, windowMs = 15 * MINUTE) {
  const diff = Date.parse(iso) - now;
  return diff >= 0 && diff <= windowMs;
}

export const formatDayOnly = (iso: string) =>
  iso ? dateFormat.format(new Date(iso)) : "";
