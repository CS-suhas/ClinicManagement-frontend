"use client";

import { useEffect, useState } from "react";
import { useNotify } from "@/components/notifications";
import { useAuth } from "@/features/auth/auth-provider";
import { canBookOnline } from "@/features/auth/permissions";
import { ApiError } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import {
  useAppointmentSettings,
  useBookAppointment,
  useBusyStarts,
  usePatient,
} from "../api";
import { bookingTimeError, overlapsBusyStart } from "../utils";
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
  const { user } = useAuth();
  const { notifyError } = useNotify();
  const book = useBookAppointment();

  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [choice, setChoice] = useState<BookingChoice | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [dateKey, setDateKey] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const providerId = (choice?.doctor ?? doctor)?.id;
  const ownPatientId =
    user && canBookOnline(user) ? user.patient?.id : undefined;

  const detailsPatientId = choice ? ownPatientId : undefined;
  const ownPatient = usePatient(detailsPatientId);
  const settings = useAppointmentSettings();
  const busy = useBusyStarts(providerId, dateKey);

  useEffect(() => {
    if (settings.error) notifyError(getErrorMessage(settings.error));
  }, [settings.error, notifyError]);
  useEffect(() => {
    if (busy.error) notifyError(getErrorMessage(busy.error));
  }, [busy.error, notifyError]);

  const busyStarts = busy.data ?? [];

  const confirm = async (details: BookingDetails) => {
    if (!choice || !ownPatientId) return;
    setFormError(null);
    try {
      if (!settings.data)
        throw new Error(
          "Appointment settings could not be loaded from the API.",
        );
      const reasonForVisit = details.reasonForVisit.trim();
      const timeError = bookingTimeError(choice.dateTime, settings.data);
      if (timeError)
        throw new Error(`${timeError}. Go back and pick another time.`);
      if (
        overlapsBusyStart(
          choice.dateTime,
          settings.data.appointmentDurationMinutes,
          busyStarts,
        )
      )
        throw new Error(SLOT_TAKEN_MESSAGE);

      try {
        await book.mutateAsync({
          patientId: ownPatientId,
          providerId: choice.doctor.id,
          dateTime: choice.dateTime,
          reasonForVisit,
        });
      } catch (e) {
        if (e instanceof ApiError && e.status === 409)
          throw new Error(SLOT_TAKEN_MESSAGE);
        throw e;
      }
      setConfirmed(true);
    } catch (e) {
      setFormError(getErrorMessage(e));
    }
  };

  const finish = () => {
    setChoice(null);
    setDoctor(null);
    setDateKey("");
    setConfirmed(false);
    setFormError(null);
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
      setFormError(null);
      setChoice({ doctor: chosen, dateTime });
      setDoctor(null);
    },
    backToSlots: () => {
      if (choice) setDoctor(choice.doctor);
      setChoice(null);
      setFormError(null);
    },
    patient: ownPatient.data,
    patientError: ownPatient.error ? getErrorMessage(ownPatient.error) : null,
    confirmed,
    confirm,
    finish,
    submitting: book.isPending,
    formError,
  };
}
