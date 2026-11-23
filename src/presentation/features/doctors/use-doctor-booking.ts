"use client";

import { useEffect, useState } from "react";
import { canBookOnline } from "@/application/auth/permissions";
import { useService } from "@/di/container-provider";
import {
  type AppointmentInput,
  validateAppointmentSchedule,
} from "@/domain/entities";
import { useAuth } from "@/presentation/auth/auth-provider";
import { useNotify } from "@/presentation/components/notifications";
import { useAsyncData } from "@/presentation/hooks/use-async-data";
import { useFormSubmit } from "@/presentation/hooks/use-form-submit";
import type { DoctorProfile } from "./doctor-profile";
import { toOffsetDateTime } from "./time-slots";

export interface BookingDetails {
  reasonForVisit: string;
}

export interface BookingChoice {
  doctor: DoctorProfile;
  /** `YYYY-MM-DDTHH:mm` */
  dateTime: string;
}

/**
 * The patient's booking journey: pick a doctor, pick a slot, confirm. Every
 * booking uses the signed-in patient's own record; the caller must be a patient.
 */
export function useDoctorBooking() {
  const patientService = useService("patientService");
  const appointmentService = useService("appointmentService");
  const configurationService = useService("configurationService");
  const { user } = useAuth();
  const { notifyError } = useNotify();
  const { submitting, formError, run, reset } = useFormSubmit();

  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [choice, setChoice] = useState<BookingChoice | null>(null);
  const [confirmed, setConfirmed] = useState(false);
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
  const booked = useAsyncData(
    () =>
      providerId
        ? appointmentService.search({ providerId, page: 1, pageSize: 100 })
        : Promise.resolve(undefined),
    providerId ?? "",
  );

  useEffect(() => {
    if (settings.error) notifyError(settings.error);
  }, [settings.error, notifyError]);
  useEffect(() => {
    if (booked.error) notifyError(booked.error);
  }, [booked.error, notifyError]);

  const bookedItems = booked.data?.items ?? [];

  const confirm = async (details: BookingDetails) => {
    if (!choice || !ownPatientId) return;
    const ok = await run(async () => {
      if (!settings.data)
        throw new Error(
          "Appointment settings could not be loaded from the API.",
        );
      const slot: AppointmentInput = {
        patientId: ownPatientId,
        providerId: choice.doctor.id,
        appointmentDateTime: choice.dateTime,
        reasonForVisit: details.reasonForVisit.trim(),
      };
      const scheduleErrors = validateAppointmentSchedule(
        slot,
        settings.data,
        bookedItems,
      );
      if (scheduleErrors.appointmentDateTime)
        throw new Error(
          `${scheduleErrors.appointmentDateTime}. Go back and pick another time.`,
        );

      await appointmentService.create({
        ...slot,
        appointmentDateTime: toOffsetDateTime(choice.dateTime),
      });
      await booked.refresh();
    });
    if (ok) setConfirmed(true);
  };

  const finish = () => {
    setChoice(null);
    setDoctor(null);
    setConfirmed(false);
    reset();
  };

  return {
    /** Step 1: the doctor whose slots are being picked. */
    slotDoctor: doctor,
    startBooking: setDoctor,
    cancelSlotPicking: () => setDoctor(null),
    settings: settings.data,
    bookedStarts: bookedItems.map((a) => a.appointmentDateTime),
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
