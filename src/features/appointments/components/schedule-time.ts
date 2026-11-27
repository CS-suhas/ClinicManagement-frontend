import type { AppointmentSettings } from "@/domain/entities";

export type AppointmentView = "month" | "day" | "week" | "list";

const BASE_PX_PER_MINUTE = 2.5;

const MIN_BLOCK_PX = 64;

export const calendarPxPerMinute = (duration: number) =>
  Math.max(BASE_PX_PER_MINUTE, MIN_BLOCK_PX / Math.max(duration, 1));

const pad = (n: number) => String(n).padStart(2, "0");

export function toDateKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const dateKeyOf = (iso: string) => toDateKey(Date.parse(iso));

export function minutesOfDay(ms: number): number {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
}

const clockToMinutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

export type ClinicWindow = {
  opening: number;
  closing: number;
  duration: number;
};

export function clinicWindow(settings: AppointmentSettings): ClinicWindow {
  return {
    opening: clockToMinutes(settings.clinicOpeningTime),
    closing: clockToMinutes(settings.clinicClosingTime),
    duration: settings.appointmentDurationMinutes,
  };
}

export const clock24 = (minutes: number) =>
  `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

export function clock12(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  return `${hours % 12 || 12}:${pad(minutes % 60)} ${hours < 12 ? "am" : "pm"}`;
}

export const clockOf = (iso: string) => {
  const d = new Date(iso);
  return clock12(d.getHours() * 60 + d.getMinutes());
};

export function timeRange(start: number, duration: number): string {
  const plain = (m: number) => `${Math.floor(m / 60)}:${pad(m % 60)}`;
  return `${plain(start)} – ${plain(start + duration)}`;
}

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

export function toneOf(id: string, order: readonly string[]): string {
  const position = order.indexOf(id);
  let index = position;
  if (index < 0) {
    index = 0;
    for (const char of id) index = (index * 31 + char.charCodeAt(0)) >>> 0;
  }
  return PROVIDER_TONES[index % PROVIDER_TONES.length];
}
