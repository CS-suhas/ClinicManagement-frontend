import type { AppointmentSettings } from "@/domain/entities";

/** Which view the page shows. Each role gets a subset, see appointments-view. */
export type AppointmentView = "month" | "day" | "week" | "list";

/** About 150px per hour: room for a time, a name and a status pill in one block. */
export const CALENDAR_PX_PER_MINUTE = 2.5;

const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar day of a timestamp, "YYYY-MM-DD". */
export function toDateKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local calendar day of an appointment's date-time string. */
export const dateKeyOf = (iso: string) => toDateKey(Date.parse(iso));

/** Minutes since local midnight. */
export function minutesOfDay(ms: number): number {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
}

/** "HH:mm" or "HH:mm:ss" to minutes since midnight. */
const clockToMinutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

export interface ClinicWindow {
  /** Minutes since midnight. */
  opening: number;
  closing: number;
  duration: number;
}

export function clinicWindow(settings: AppointmentSettings): ClinicWindow {
  return {
    opening: clockToMinutes(settings.clinicOpeningTime),
    closing: clockToMinutes(settings.clinicClosingTime),
    duration: settings.appointmentDurationMinutes,
  };
}

/** "08:00" */
export const clock24 = (minutes: number) =>
  `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/** "9:00 am" */
export function clock12(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  return `${hours % 12 || 12}:${pad(minutes % 60)} ${hours < 12 ? "am" : "pm"}`;
}

/** "10:20 am" for an appointment start, local time. */
export const clockOf = (iso: string) => {
  const d = new Date(iso);
  return clock12(d.getHours() * 60 + d.getMinutes());
};

/** "9:00 – 9:45" for a slot starting at `start`. */
export function timeRange(start: number, duration: number): string {
  const plain = (m: number) => `${Math.floor(m / 60)}:${pad(m % 60)}`;
  return `${plain(start)} – ${plain(start + duration)}`;
}

/** "April 27, 2024" for a "YYYY-MM-DD" local day. */
export function dayLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
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

/**
 * Accent colour for a provider. Its position in `order` (the sorted provider
 * list) picks the colour, so neighbours differ; unknown ids fall back to a hash.
 */
export function toneOf(id: string, order: readonly string[]): string {
  const position = order.indexOf(id);
  let index = position;
  if (index < 0) {
    index = 0;
    for (const char of id) index = (index * 31 + char.charCodeAt(0)) >>> 0;
  }
  return PROVIDER_TONES[index % PROVIDER_TONES.length];
}
