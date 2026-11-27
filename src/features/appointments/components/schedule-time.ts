import { format, parseISO } from "date-fns";
import type { AppointmentSettings } from "../schemas";
import { clockToMinutes, minutesToClock } from "../utils";

export type AppointmentView = "month" | "day" | "week" | "list";

const BASE_PX_PER_MINUTE = 2.5;

const MIN_BLOCK_PX = 64;

export const calendarPxPerMinute = (duration: number) =>
  Math.max(BASE_PX_PER_MINUTE, MIN_BLOCK_PX / Math.max(duration, 1));

const pad = (n: number) => String(n).padStart(2, "0");

export const toDateKey = (ms: number) => format(ms, "yyyy-MM-dd");

export const dateKeyOf = (iso: string) => toDateKey(Date.parse(iso));

export function minutesOfDay(ms: number): number {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
}

export type ClinicWindow = {
  opening: number;
  closing: number;
  duration: number;
};

export function clinicWindow(settings: AppointmentSettings): ClinicWindow {
  return {
    opening: clockToMinutes(settings.clinicOpeningTime) ?? 0,
    closing: clockToMinutes(settings.clinicClosingTime) ?? 0,
    duration: settings.appointmentDurationMinutes,
  };
}

export const clock24 = minutesToClock;

export function clock12(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  return `${hours % 12 || 12}:${pad(minutes % 60)} ${hours < 12 ? "am" : "pm"}`;
}

export const clockOf = (iso: string) => clock12(minutesOfDay(Date.parse(iso)));

export function dayLabel(dateKey: string): string {
  return parseISO(dateKey).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const PROVIDER_TONES = [
  "#007d8a",
  "#6d4fc2",
  "#b7791f",
  "#2f6fbd",
  "#c2416a",
  "#3d8b4f",
];

export function toneOf(id: string, order: readonly string[]): string {
  const position = order.indexOf(id);
  let index = position;
  if (index < 0) {
    index = 0;
    for (const char of id) index = (index * 31 + char.charCodeAt(0)) >>> 0;
  }
  return PROVIDER_TONES[index % PROVIDER_TONES.length];
}
