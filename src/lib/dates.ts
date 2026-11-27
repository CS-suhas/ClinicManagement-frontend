import {
  addDays as addDaysToDate,
  format,
  formatISO,
  parseISO,
} from "date-fns";

export const addDays = (date: string, days: number) =>
  format(addDaysToDate(parseISO(date), days), "yyyy-MM-dd");

export const localMidnightIso = (date: string) => formatISO(parseISO(date));

export const toOffsetDateTime = (local: string) =>
  formatISO(parseISO(local.slice(0, 16)));
