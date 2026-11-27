"use client";

import { useEffect, useState } from "react";
import { useNotify } from "@/components/notifications";
import { useService } from "@/di/container-provider";
import {
  overlapsBusyStart,
  validateAppointmentSchedule,
} from "@/domain/entities";
import { ConflictError } from "@/domain/errors";
import { useAuth } from "@/features/auth/auth-provider";
import { canBookOnline } from "@/features/auth/permissions";
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
  dateTime: string;
};

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
  const [dateKey, setDateKey] = useState("");
  const providerId = (choice?.doctor ?? doctor)?.id;
  const ownPatientId =
    user && canBookOnline(user) ? user.patient?.id : undefined;

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
    slotDoctor: doctor,
    startBooking: (chosen: DoctorProfile) => {
      setDateKey(toDateKey(new Date()));
      setDoctor(chosen);
    },
    cancelSlotPicking: () => setDoctor(null),
    settings: settings.data,
    dateKey,
    setDateKey,
    bookedStarts: busyStarts,
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
    patient: ownPatient.data,
    patientError: ownPatient.error,
    confirmed,
    confirm,
    finish,
    submitting,
    formError,
  };
}
