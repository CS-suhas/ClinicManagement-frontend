"use client";

import { useEffect, useState } from "react";
import { canBookOnline } from "@/application/auth/permissions";
import { useNotify } from "@/components/notifications";
import { useService } from "@/di/container-provider";
import {
  overlapsBusyStart,
  validateAppointmentSchedule,
} from "@/domain/entities";
import { ConflictError } from "@/domain/errors";
import { useAuth } from "@/features/auth/auth-provider";
import { useAsyncData } from "@/hooks/use-async-data";
import { useFormSubmit } from "@/hooks/use-form-submit";
import type { DoctorProfile } from "./doctor-profile";
import { toDateKey } from "./time-slots";

export const SLOT_TAKEN_MESSAGE =
  "That time was just taken — pick another slot";

export type BookingDetails = {
  reasonForVisit: string;
};

export type BookingChoice = {
  doctor: DoctorProfile;
  /** `YYYY-MM-DDTHH:mm` */
  dateTime: string;
};

/**
 * The patient's booking journey: pick a doctor, pick a slot, confirm. Every
 * booking uses the signed-in patient's own record; the caller must be a patient.
 */
export function useDoctorBooking() {
  const appointmentService = useService("appointmentService");
  const configurationService = useService("configurationService");
  const patientService = useService("patientService");
  const { user } = useAuth();
  const { notifyError } = useNotify();
  const { submitting, formError, run, reset } = useFormSubmit();

  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [choice, setChoice] = useState<BookingChoice | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  /** The local day being viewed, `YYYY-MM-DD`. Busy starts are fetched for this day only. */
  const [dateKey, setDateKey] = useState("");
  const providerId = (choice?.doctor ?? doctor)?.id;
  const ownPatientId =
    user && canBookOnline(user) ? user.patient?.id : undefined;

  // The patient record is only needed for the details step.
  const detailsPatientId = choice ? ownPatientId : undefined;
  const ownPatient = useAsyncData(
    () =>
      detailsPatientId
        ? patientService.get(detailsPatientId)
        : Promise.resolve(undefined),
    detailsPatientId ?? "",
  );

  const settings = useAsyncData(() =>
    configurationService.getAppointmentSettings(),
  );
  // Busy starts are public, so this works for visitors too. The appointment
  // search is scoped to the caller and cannot show another patient's bookings.
  const busy = useAsyncData(
    () =>
      providerId && dateKey
        ? appointmentService.busyStarts(providerId, dateKey)
        : Promise.resolve<string[]>([]),
    `${providerId ?? ""}|${dateKey}`,
  );

  useEffect(() => {
    if (settings.error) notifyError(settings.error);
  }, [settings.error, notifyError]);
  useEffect(() => {
    if (busy.error) notifyError(busy.error);
  }, [busy.error, notifyError]);

  const busyStarts = busy.data ?? [];

  const confirm = async (details: BookingDetails) => {
    if (!choice || !ownPatientId) return;
    const ok = await run(async () => {
      if (!settings.data)
        throw new Error(
          "Appointment settings could not be loaded from the API.",
        );
      const reasonForVisit = details.reasonForVisit.trim();
      const scheduleErrors = validateAppointmentSchedule(
        {
          patientId: ownPatientId,
          providerId: choice.doctor.id,
          appointmentDateTime: choice.dateTime,
          reasonForVisit,
        },
        settings.data,
        [],
      );
      if (scheduleErrors.appointmentDateTime)
        throw new Error(
          `${scheduleErrors.appointmentDateTime}. Go back and pick another time.`,
        );
      if (
        overlapsBusyStart(
          choice.dateTime,
          settings.data.appointmentDurationMinutes,
          busyStarts,
        )
      )
        throw new Error(SLOT_TAKEN_MESSAGE);

      try {
        await appointmentService.bookAsPatient(
          {
            providerId: choice.doctor.id,
            appointmentDateTime: choice.dateTime,
            reasonForVisit,
          },
          user,
        );
      } catch (e) {
        // The API answers 409 when another booking landed first.
        if (e instanceof ConflictError) throw new Error(SLOT_TAKEN_MESSAGE);
        throw e;
      }
      await busy.refresh();
    });
    if (ok) setConfirmed(true);
  };

  const finish = () => {
    setChoice(null);
    setDoctor(null);
    setDateKey("");
    setConfirmed(false);
    reset();
  };

  return {
    /** Step 1: the doctor whose slots are being picked. */
    slotDoctor: doctor,
    /** Opens slot picking on today. */
    startBooking: (chosen: DoctorProfile) => {
      setDateKey(toDateKey(new Date()));
      setDoctor(chosen);
    },
    cancelSlotPicking: () => setDoctor(null),
    settings: settings.data,
    /** The day being viewed, `YYYY-MM-DD`. */
    dateKey,
    setDateKey,
    /** Busy start times (ISO) of the doctor on the viewed day. */
    bookedStarts: busyStarts,
    /** Step 2: the chosen slot, awaiting the patient's confirmation. */
    choice,
    chooseSlot: (chosen: DoctorProfile, dateTime: string) => {
      reset();
      setChoice({ doctor: chosen, dateTime });
      setDoctor(null);
    },
    backToSlots: () => {
      if (choice) setDoctor(choice.doctor);
      setChoice(null);
      reset();
    },
    /** The signed-in patient whose record the booking is made under. */
    patient: ownPatient.data,
    patientError: ownPatient.error,
    /** Step 3: the booking went through. */
    confirmed,
    confirm,
    finish,
    submitting,
    formError,
  };
}
