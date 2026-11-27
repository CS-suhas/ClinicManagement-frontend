import {
  type AppointmentSettings,
  clockToMinutes,
  minutesToClock,
} from "@/domain/entities";

export function appointmentTimeBounds(
  settings: AppointmentSettings | undefined,
) {
  if (!settings) return { opening: undefined, latestStart: undefined };
  const opening = clockToMinutes(settings.clinicOpeningTime);
  const closing = clockToMinutes(settings.clinicClosingTime);
  const latest =
    closing === null ? null : closing - settings.appointmentDurationMinutes;
  return {
    opening: opening === null ? undefined : minutesToClock(opening),
    latestStart:
      latest !== null && latest >= 0 ? minutesToClock(latest) : undefined,
  };
}
