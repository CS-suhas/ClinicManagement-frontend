import type { AppointmentSettings } from "@/domain/entities";

const toMinutes = (time: string) =>
  time
    .slice(0, 5)
    .split(":")
    .reduce((minutes, part) => minutes * 60 + Number(part), 0);

const toTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/**
 * Earliest and latest start time (HH:mm) of an appointment on a day, so the
 * appointment ends before closing. Undefined until settings are loaded.
 */
export function appointmentTimeBounds(
  settings: AppointmentSettings | undefined,
) {
  if (!settings) return { opening: undefined, latestStart: undefined };
  const latest =
    toMinutes(settings.clinicClosingTime) - settings.appointmentDurationMinutes;
  return {
    opening: settings.clinicOpeningTime.slice(0, 5),
    latestStart: latest >= 0 ? toTime(latest) : undefined,
  };
}
