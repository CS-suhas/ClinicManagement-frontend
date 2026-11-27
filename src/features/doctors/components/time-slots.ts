import type { AppointmentSettings } from "../schemas";
import {
  clockToMinutes,
  isWithinClinicHours,
  minutesToClock,
  overlapsBusyStart,
} from "../utils";

export type SlotPeriod = "Morning" | "Afternoon" | "Evening";

export type TimeSlot = {
  value: string;
  label: string;
  period: SlotPeriod;
  unavailable: boolean;
};

const pad = (n: number) => String(n).padStart(2, "0");

export const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export function upcomingDays(count: number, from = new Date()): Date[] {
  return Array.from({ length: count }, (_, i) => {
    const day = new Date(from);
    day.setDate(from.getDate() + i);
    return day;
  });
}

const periodOf = (minutes: number): SlotPeriod =>
  minutes < 12 * 60 ? "Morning" : minutes < 17 * 60 ? "Afternoon" : "Evening";

const labelOf = (minutes: number) =>
  new Date(
    2000,
    0,
    1,
    Math.floor(minutes / 60),
    minutes % 60,
  ).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export function buildSlots(
  dateKey: string,
  settings: AppointmentSettings,
  bookedStarts: string[],
  now = new Date(),
): TimeSlot[] {
  const opening = clockToMinutes(settings.clinicOpeningTime);
  if (opening === null) return [];

  const duration = settings.appointmentDurationMinutes;
  const slots: TimeSlot[] = [];

  for (
    let minutes = opening;
    isWithinClinicHours(minutes, duration, settings);
    minutes += duration
  ) {
    const value = `${dateKey}T${minutesToClock(minutes)}`;
    slots.push({
      value,
      label: labelOf(minutes),
      period: periodOf(minutes),
      unavailable:
        overlapsBusyStart(value, duration, bookedStarts) ||
        Date.parse(value) <= now.getTime(),
    });
  }
  return slots;
}
