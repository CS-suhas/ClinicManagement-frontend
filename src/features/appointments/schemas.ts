import { z } from "zod";
import type { Schemas } from "@/lib/api";
import { clockToMinutes, isWithinClinicHours } from "./utils";

export type AppointmentListItem = Schemas["AppointmentListResponse"];
export type AppointmentSettings = Schemas["AppointmentSettingsResponse"];
export type AppointmentInput = Pick<
  Schemas["AppointmentRequest"],
  "patientId" | "providerId" | "appointmentDateTime" | "reasonForVisit"
>;
export type Provider = Schemas["ProviderResponse"];

export const AppointmentStatus = z.enum([
  "REQUESTED",
  "CONFIRMED",
  "DECLINED",
  "CANCELLED",
  "COMPLETED",
]);
export type AppointmentStatus = z.infer<typeof AppointmentStatus>;

export const AppointmentAction = z.enum([
  "confirm",
  "decline",
  "complete",
  "cancel",
]);
export type AppointmentAction = z.infer<typeof AppointmentAction>;

const clockTime = z.string().refine((time) => clockToMinutes(time) !== null);

export const appointmentSettingsSchema = z
  .object({
    appointmentDurationMinutes: z.number().int().positive(),
    clinicOpeningTime: clockTime,
    clinicClosingTime: clockTime,
  })
  .refine(
    ({ clinicOpeningTime, clinicClosingTime }) =>
      (clockToMinutes(clinicOpeningTime) ?? 0) <
      (clockToMinutes(clinicClosingTime) ?? 0),
  );

export type AppointmentFormValues = {
  patientId: string;
  clinicId: string;
  providerId: string;
  appointmentDateTime: string;
  reasonForVisit: string;
};

function scheduleError(dateTime: string, settings: AppointmentSettings) {
  const timeMatch = /T(\d{2}):(\d{2})/.exec(dateTime);
  if (
    !timeMatch ||
    clockToMinutes(settings.clinicOpeningTime) === null ||
    clockToMinutes(settings.clinicClosingTime) === null
  )
    return "Appointment settings or time are invalid";
  const startMinutes = Number(timeMatch[1]) * 60 + Number(timeMatch[2]);
  if (!isWithinClinicHours(startMinutes, settings))
    return `Appointment must fit within clinic hours ${settings.clinicOpeningTime.slice(0, 5)}–${settings.clinicClosingTime.slice(0, 5)}`;
  return null;
}

export function appointmentForm(
  settings: AppointmentSettings | undefined,
  clinicOfProvider: (providerId: string) => string | undefined,
) {
  return z
    .object({
      patientId: z.string(),
      clinicId: z.string(),
      providerId: z.string(),
      appointmentDateTime: z.string(),
      reasonForVisit: z.string().trim(),
    })
    .superRefine((values, ctx) => {
      const fail = (path: keyof AppointmentFormValues, message: string) =>
        ctx.addIssue({ code: "custom", path: [path], message });
      if (!values.patientId.trim()) fail("patientId", "Patient is required");
      if (!values.providerId.trim()) fail("providerId", "Provider is required");
      if (!values.appointmentDateTime.trim())
        fail("appointmentDateTime", "Date & time is required");
      else if (Number.isNaN(Date.parse(values.appointmentDateTime)))
        fail("appointmentDateTime", "Invalid date");
      else if (settings) {
        const message = scheduleError(values.appointmentDateTime, settings);
        if (message) fail("appointmentDateTime", message);
      }
      if (!values.clinicId) fail("clinicId", "Clinic is required");
      else if (clinicOfProvider(values.providerId) !== values.clinicId)
        fail("providerId", "Select a provider from the selected clinic");
    });
}
