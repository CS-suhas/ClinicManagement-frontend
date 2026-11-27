import type { Schemas } from "@/lib/api";
import { toOffsetDateTime } from "@/lib/dates";

export type AppointmentSettings = Schemas["AppointmentSettingsResponse"];

export const fullName = (person: { firstName: string; lastName: string }) =>
  `${person.firstName} ${person.lastName}`.trim();

const pad = (n: number) => String(n).padStart(2, "0");

export const localDayOf = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function clockToMinutes(time: string): number | null {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(time);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours <= 23 && minutes <= 59 ? hours * 60 + minutes : null;
}

export const minutesToClock = (minutes: number) =>
  `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

function isWithinClinicHours(
  startMinutes: number,
  durationMinutes: number,
  settings: AppointmentSettings,
): boolean {
  const opening = clockToMinutes(settings.clinicOpeningTime);
  const closing = clockToMinutes(settings.clinicClosingTime);
  if (opening === null || closing === null) return false;
  return startMinutes >= opening && startMinutes + durationMinutes <= closing;
}

function overlapsBusyStart(
  dateTime: string,
  durationMinutes: number,
  busyStarts: readonly string[],
): boolean {
  const durationMs = durationMinutes * 60_000;
  const start = Date.parse(dateTime);
  return busyStarts.some((busy) => {
    const existing = Date.parse(busy);
    return start < existing + durationMs && existing < start + durationMs;
  });
}

export function slotCount(settings: AppointmentSettings): number {
  const opening = clockToMinutes(settings.clinicOpeningTime);
  if (opening === null) return 0;
  let count = 0;
  for (
    let m = opening;
    isWithinClinicHours(m, settings.appointmentDurationMinutes, settings);
    m += settings.appointmentDurationMinutes
  )
    count++;
  return count;
}

export function freeSlotStarts(
  settings: AppointmentSettings,
  day: string,
  busyStarts: string[],
  nowMs: number,
): string[] {
  const opening = clockToMinutes(settings.clinicOpeningTime);
  if (opening === null) return [];
  const duration = settings.appointmentDurationMinutes;
  const free: string[] = [];
  for (
    let m = opening;
    isWithinClinicHours(m, duration, settings);
    m += duration
  ) {
    const iso = toOffsetDateTime(`${day}T${minutesToClock(m)}`);
    if (Date.parse(iso) <= nowMs) continue;
    if (overlapsBusyStart(iso, duration, busyStarts)) continue;
    free.push(iso);
  }
  return free;
}
