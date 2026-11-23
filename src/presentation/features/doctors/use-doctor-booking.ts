"use client";

import { useEffect, useState } from "react";
import { useService } from "@/di/container-provider";
import {
  type AppointmentInput,
  type PatientInput,
  validateAppointmentSchedule,
} from "@/domain/entities";
import { useNotify } from "@/presentation/components/notifications";
import { useAsyncData } from "@/presentation/hooks/use-async-data";
import { useFormSubmit } from "@/presentation/hooks/use-form-submit";
import type { DoctorProfile } from "./doctor-profile";

export interface BookingDetails extends PatientInput {
  reasonForVisit: string;
}

export interface BookingChoice {
  doctor: DoctorProfile;
  /** `YYYY-MM-DDTHH:mm` */
  dateTime: string;
}

/**
 * The visitor's booking journey: pick a doctor, pick a slot, enter details.
 * A visitor has no account, so a patient record is found by email or created.
 */
export function useDoctorBooking() {
  const patientService = useService("patientService");
  const appointmentService = useService("appointmentService");
  const configurationService = useService("configurationService");
  const { notifyError } = useNotify();
  const { submitting, fieldErrors, formError, run, reset } = useFormSubmit();

  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [choice, setChoice] = useState<BookingChoice | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const providerId = (choice?.doctor ?? doctor)?.id;

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
    if (!choice) return;
    const ok = await run(async () => {
      if (!settings.data)
        throw new Error(
          "Appointment settings could not be loaded from the API.",
        );
      const { reasonForVisit, ...patientInput } = details;
      const trimmed: PatientInput = {
        firstName: patientInput.firstName.trim(),
        lastName: patientInput.lastName.trim(),
        dateOfBirth: patientInput.dateOfBirth,
        email: patientInput.email.trim(),
        phoneNumber: patientInput.phoneNumber.trim(),
      };
      patientService.validateInput(trimmed);

      const slot: AppointmentInput = {
        patientId: "pending",
        providerId: choice.doctor.id,
        appointmentDateTime: choice.dateTime,
        reasonForVisit: reasonForVisit.trim(),
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

      const email = trimmed.email.toLowerCase();
      const { items } = await patientService.search({
        search: trimmed.email,
        page: 1,
        pageSize: 20,
      });
      const patient =
        items.find((p) => p.email.toLowerCase() === email) ??
        (await patientService.create(trimmed));

      await appointmentService.create({ ...slot, patientId: patient.id });
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
    /** Step 2: the chosen slot, awaiting the visitor's details. */
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
    /** Step 3: the booking went through. */
    confirmed,
    confirm,
    finish,
    submitting,
    fieldErrors,
    formError,
  };
}
