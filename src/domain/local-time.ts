const pad = (n: number) => String(n).padStart(2, "0");

/** Shifts a "YYYY-MM-DD" local day by whole days. */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(year, month - 1, day + days);
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
}

/** Local midnight at the start of a "YYYY-MM-DD" day, with the local UTC offset, e.g. 2026-11-23T00:00:00+05:30. */
export function localMidnightIso(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const offsetMinutes = -new Date(year, month - 1, day).getTimezoneOffset();
  const sign = offsetMinutes < 0 ? "-" : "+";
  const abs = Math.abs(offsetMinutes);
  return `${date}T00:00:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/**
 * A local `YYYY-MM-DDTHH:mm` as ISO-8601 with the local UTC offset, e.g.
 * `2026-11-24T09:00:00+05:30`. Reads the timezone, so call it from event
 * handlers or services, never at module level.
 */
export function toOffsetDateTime(local: string): string {
  const [year, month, day] = local.slice(0, 10).split("-").map(Number);
  const [hours, minutes] = local.slice(11, 16).split(":").map(Number);
  const offset = -new Date(
    year,
    month - 1,
    day,
    hours,
    minutes,
  ).getTimezoneOffset();
  const magnitude = Math.abs(offset);
  const sign = offset < 0 ? "-" : "+";
  return `${local.slice(0, 16)}:00${sign}${pad(Math.floor(magnitude / 60))}:${pad(magnitude % 60)}`;
}
