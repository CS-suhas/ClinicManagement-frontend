"use client";

import { useEffect, useState } from "react";
import { useService } from "@/di/container-provider";
import {
  type AppointmentInput,
  patientFullName,
  providerFullName,
  validateAppointmentSchedule,
} from "@/domain/entities";
import { assertValid } from "@/domain/errors";
import type { AppointmentListItem } from "@/domain/repositories";
import { useAsyncData } from "@/presentation/hooks/use-async-data";
import { useFormSubmit } from "@/presentation/hooks/use-form-submit";
import { useSearchOptions } from "@/presentation/hooks/use-search-options";
import { appointmentTimeBounds } from "@/presentation/lib/appointment-hours";
import { toDateTimeLocal } from "@/presentation/lib/format";

interface AppointmentFormValues extends AppointmentInput {
  clinicId: string;
}

const EMPTY: AppointmentFormValues = {
  clinicId: "",
  patientId: "",
  providerId: "",
  appointmentDateTime: "",
  reasonForVisit: "",
};

const OPTIONS_PAGE = { page: 1, pageSize: 100 };

export interface UseAppointmentFormOptions {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AppointmentListItem | null;
  /** Receives the input plus the joined names the list row needs. */
  onSave: (
    input: AppointmentInput,
    editing: AppointmentListItem | null,
    overrides: Partial<AppointmentListItem>,
  ) => void;
  /** Pre-filled date-time (datetime-local value) when creating. */
  defaultDateTime?: string;
  /** Pre-selected patient when creating, e.g. from a patient page. */
  defaultPatientId?: string;
}

/** State and rules of the appointment dialog; the component only renders. */
export function useAppointmentForm({
  open,
  onOpenChange,
  appointment,
  onSave,
  defaultDateTime,
  defaultPatientId,
}: UseAppointmentFormOptions) {
  const patientService = useService("patientService");
  const providerService = useService("providerService");
  const clinicService = useService("clinicService");
  const configurationService = useService("configurationService");
  const { submitting, fieldErrors, formError, run, reset } = useFormSubmit();
  const [optionsReady, setOptionsReady] = useState(false);
  const [values, setValues] = useState<AppointmentFormValues>(EMPTY);
  const active = open && optionsReady;

  const {
    data: settings,
    error: settingsError,
    reload: reloadSettings,
  } = useAsyncData(
    () =>
      active
        ? configurationService.getAppointmentSettings()
        : Promise.resolve(undefined),
    `${active}`,
  );
  const patients = useSearchOptions(active, (search) =>
    patientService.search({ search, ...OPTIONS_PAGE }),
  );
  const clinics = useSearchOptions(active, (search) =>
    clinicService.search({ search, ...OPTIONS_PAGE }),
  );
  const providers = useSearchOptions(
    active && values.clinicId !== "",
    (search) =>
      providerService.search({
        clinicId: values.clinicId,
        search,
        ...OPTIONS_PAGE,
      }),
    values.clinicId,
  );

  const { setQuery: setPatientQuery } = patients;
  const { setQuery: setClinicQuery } = clinics;
  const { setQuery: setProviderQuery } = providers;

  useEffect(() => {
    if (!open) {
      setOptionsReady(false);
      setPatientQuery("");
      setClinicQuery("");
      setProviderQuery("");
      setValues(EMPTY);
      return;
    }
    reset();
    setPatientQuery(appointment?.patientName ?? "");
    setClinicQuery(appointment?.clinicName ?? "");
    setProviderQuery(appointment?.providerName ?? "");
    setValues(
      appointment
        ? {
            clinicId: appointment.clinicId,
            patientId: appointment.patientId,
            providerId: appointment.providerId,
            appointmentDateTime: toDateTimeLocal(
              appointment.appointmentDateTime,
            ),
            reasonForVisit: appointment.reasonForVisit ?? "",
          }
        : { ...EMPTY, appointmentDateTime: defaultDateTime ?? "" },
    );
    setOptionsReady(true);
    if (!appointment && defaultPatientId) {
      patientService
        .get(defaultPatientId)
        .then((patient) => {
          setValues((current) => ({ ...current, patientId: patient.id }));
          setPatientQuery(patientFullName(patient));
        })
        .catch(() => {});
    }
  }, [
    open,
    appointment,
    defaultDateTime,
    defaultPatientId,
    patientService,
    reset,
    setPatientQuery,
    setClinicQuery,
    setProviderQuery,
  ]);

  const submit = async () => {
    const ok = await run(async () => {
      if (!settings)
        throw new Error(
          "Appointment settings could not be loaded from the API.",
        );
      const input: AppointmentInput = {
        patientId: values.patientId,
        providerId: values.providerId,
        appointmentDateTime: values.appointmentDateTime,
        reasonForVisit: values.reasonForVisit.trim(),
      };
      const errors = validateAppointmentSchedule(
        input,
        settings,
        [],
        appointment?.id,
      );
      const provider = providers.items.find(
        (item) => item.id === values.providerId,
      );
      if (!values.clinicId) errors.clinicId = "Clinic is required";
      else if (!provider || provider.clinicId !== values.clinicId)
        errors.providerId = "Select a provider from the selected clinic";
      assertValid(errors);
      const patient = patients.items.find((p) => p.id === values.patientId);
      const clinic = clinics.items.find((c) => c.id === values.clinicId);
      const unchanged = (field: "patientId" | "clinicId") =>
        appointment?.[field] === values[field];
      onSave(input, appointment, {
        patientName: patient
          ? patientFullName(patient)
          : unchanged("patientId")
            ? appointment?.patientName
            : "",
        providerName: provider ? providerFullName(provider) : "",
        providerSpecialty: provider?.specialty ?? "",
        clinicId: values.clinicId,
        clinicName: clinic
          ? clinic.name
          : unchanged("clinicId")
            ? appointment?.clinicName
            : "",
      });
    });
    if (ok) onOpenChange(false);
  };

  const date = values.appointmentDateTime.slice(0, 10);
  const { opening, latestStart } = appointmentTimeBounds(settings);

  return {
    values,
    setValue: <K extends keyof AppointmentFormValues>(
      field: K,
      value: AppointmentFormValues[K],
    ) => setValues((current) => ({ ...current, [field]: value })),
    /** Changing the clinic invalidates the chosen provider. */
    selectClinic: (clinicId: string) => {
      setValues((current) => ({ ...current, clinicId, providerId: "" }));
      setProviderQuery("");
    },
    patients,
    clinics,
    providers,
    settings,
    fieldErrors,
    /** Allowed range of the date-time input for the chosen day. */
    timeBounds: {
      min: date && opening ? `${date}T${opening}` : undefined,
      max: date && latestStart ? `${date}T${latestStart}` : undefined,
    },
    /** Failed option/settings loads, each with a retry. */
    loadErrors: [
      { message: settingsError, retry: reloadSettings },
      { message: patients.error, retry: patients.reload },
      { message: clinics.error, retry: clinics.reload },
      { message: providers.error, retry: providers.reload },
    ].flatMap(({ message, retry }) => (message ? [{ message, retry }] : [])),
    dialogProps: {
      open,
      onOpenChange,
      title: appointment ? "Edit appointment" : "New appointment",
      submitLabel: appointment ? "Save changes" : "Create appointment",
      submitting,
      formError,
      onSubmit: submit,
    },
  };
}
