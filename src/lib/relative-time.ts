/**
 * Pure time formatting for the UI. Every function takes `now` (epoch ms) so the
 * caller decides when "now" is read; nothing here reads the clock, which keeps
 * prerendering deterministic.
 */

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

const sameLocalDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** Full local date and time, for titles and the pre-mount fallback. */
export function formatAbsolute(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : absoluteFormat.format(date);
}

/**
 * Short display text for a point in time, following the product rules:
 * under an hour "in 15 min" / "5 min ago"; the same day "today 14:20";
 * within a week "Thu 14:20"; otherwise the date.
 */
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
  if (sameLocalDay(target, current)) return `today ${time}`;
  if (Math.abs(diff) < 7 * DAY)
    return `${weekdayFormat.format(target)} ${time}`;
  return dateFormat.format(target);
}

/**
 * Longer phrase for a gap of days or weeks, e.g. "3 weeks ago", "in 2 days".
 * Falls back to the date for gaps over a year.
 */
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

/** Local `HH:mm` clock text, shared by slot labels. */
export const formatClock = (iso: string) =>
  iso ? timeFormat.format(new Date(iso)) : "";

/** True when the start is within `windowMs` ahead of `now` (and not in the past). */
export function startsSoon(iso: string, now: number, windowMs = 15 * MINUTE) {
  const diff = Date.parse(iso) - now;
  return diff >= 0 && diff <= windowMs;
}

/** Date part only, e.g. "23 Nov 2026" in the reader's locale. */
export const formatDayOnly = (iso: string) =>
  iso ? dateFormat.format(new Date(iso)) : "";
