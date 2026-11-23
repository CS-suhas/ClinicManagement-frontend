import type { AppointmentSettings } from "@/domain/entities";
import { appointmentTimeBounds } from "@/presentation/lib/appointment-hours";

export type SlotPeriod = "Morning" | "Afternoon" | "Evening";

export interface TimeSlot {
  /** Local date-time, `YYYY-MM-DDTHH:mm`, as the appointment API expects. */
  value: string;
  label: string;
  period: SlotPeriod;
  /** Already booked, or in the past. */
  unavailable: boolean;
}

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

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

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

/**
 * Every start time of a day, from opening until the last visit that still ends
 * before closing. `bookedStarts` are the doctor's existing appointment times.
 */
export function buildSlots(
  dateKey: string,
  settings: AppointmentSettings,
  bookedStarts: string[],
  now = new Date(),
): TimeSlot[] {
  const { opening, latestStart } = appointmentTimeBounds(settings);
  if (!opening || !latestStart) return [];

  const duration = settings.appointmentDurationMinutes;
  const booked = bookedStarts.map((start) => Date.parse(start));
  const slots: TimeSlot[] = [];

  for (
    let minutes = toMinutes(opening);
    minutes <= toMinutes(latestStart);
    minutes += duration
  ) {
    const value = `${dateKey}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
    const start = Date.parse(value);
    const end = start + duration * 60_000;
    const taken = booked.some(
      (existing) => start < existing + duration * 60_000 && existing < end,
    );
    slots.push({
      value,
      label: labelOf(minutes),
      period: periodOf(minutes),
      unavailable: taken || start <= now.getTime(),
    });
  }
  return slots;
}
