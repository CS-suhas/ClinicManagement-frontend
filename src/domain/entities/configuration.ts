export type AppointmentSettings = {
  appointmentDurationMinutes: number;
  clinicOpeningTime: string;
  clinicClosingTime: string;
};

export function clockToMinutes(time: string): number | null {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(time);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours <= 23 && minutes <= 59 ? hours * 60 + minutes : null;
}

export function minutesToClock(minutes: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export function isWithinClinicHours(
  startMinutes: number,
  durationMinutes: number,
  settings: AppointmentSettings,
): boolean {
  const opening = clockToMinutes(settings.clinicOpeningTime);
  const closing = clockToMinutes(settings.clinicClosingTime);
  if (opening === null || closing === null) return false;
  return startMinutes >= opening && startMinutes + durationMinutes <= closing;
}

export function parseAppointmentSettings(raw: unknown): AppointmentSettings {
  const invalid = () =>
    new Error("The API returned invalid appointment settings.");
  if (!raw || typeof raw !== "object") throw invalid();
  const {
    appointmentDurationMinutes: duration,
    clinicOpeningTime: openingTime,
    clinicClosingTime: closingTime,
  } = raw as Record<string, unknown>;
  if (
    typeof openingTime !== "string" ||
    typeof closingTime !== "string" ||
    typeof duration !== "number"
  )
    throw invalid();
  const opening = clockToMinutes(openingTime);
  const closing = clockToMinutes(closingTime);
  if (
    !Number.isInteger(duration) ||
    duration <= 0 ||
    opening === null ||
    closing === null ||
    opening >= closing
  )
    throw invalid();
  return {
    appointmentDurationMinutes: duration,
    clinicOpeningTime: openingTime,
    clinicClosingTime: closingTime,
  };
}

export function parseAllergySeverities(raw: unknown): string[] {
  if (
    !Array.isArray(raw) ||
    raw.length === 0 ||
    !raw.every((s) => typeof s === "string" && s.trim() !== "")
  )
    throw new Error("The API returned invalid allergy severity settings.");
  return raw;
}
