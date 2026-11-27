"use client";

import { TrashIcon } from "@radix-ui/react-icons";
import { Button, TextField } from "@radix-ui/themes";
import { useEffect, useMemo, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { ErrorCallout } from "@/components/error-callout";
import {
  FormDialog,
  SearchSelectInput,
  TextAreaInput,
} from "@/components/form";
import { FormField } from "@/components/form-field";
import { getErrorMessage } from "@/lib/errors";
import { toDateTimeLocal } from "@/lib/format";
import {
  useAppointmentSettings,
  useClinicOptions,
  usePatientById,
  usePatientOptions,
  useProviderOptions,
} from "../api";
import {
  type AppointmentFormValues,
  type AppointmentInput,
  type AppointmentListItem,
  type AppointmentSettings,
  appointmentForm,
  type Provider,
} from "../schemas";
import { appointmentTimeBounds, fullName } from "../utils";

type Lookups = {
  patients: { id: string; firstName: string; lastName: string }[];
  clinics: { id: string; name: string }[];
  providers: Provider[];
};

type FormApi = UseFormReturn<
  AppointmentFormValues,
  unknown,
  AppointmentFormValues
>;

function AppointmentFields({
  form,
  appointment,
  defaultPatientId,
  settings,
  settingsError,
  onRetrySettings,
  lookups,
  onDelete,
}: {
  form: FormApi;
  appointment: AppointmentListItem | null;
  defaultPatientId?: string;
  settings: AppointmentSettings | undefined;
  settingsError: string | null;
  onRetrySettings: () => void;
  lookups: { current: Lookups };
  onDelete?: (appointment: AppointmentListItem) => void;
}) {
  const [patientQuery, setPatientQuery] = useState(
    appointment?.patientName ?? "",
  );
  const [clinicQuery, setClinicQuery] = useState(appointment?.clinicName ?? "");
  const [providerText, setProviderText] = useState({
    clinicId: appointment?.clinicId ?? "",
    text: appointment?.providerName ?? "",
  });

  const clinicId = form.watch("clinicId");
  const dateTime = form.watch("appointmentDateTime");
  const providerQuery =
    providerText.clinicId === clinicId ? providerText.text : "";

  const patients = usePatientOptions(true, patientQuery);
  const clinics = useClinicOptions(true, clinicQuery);
  const providers = useProviderOptions(
    clinicId !== "",
    clinicId,
    providerQuery,
  );
  const defaultPatient = usePatientById(
    appointment ? undefined : defaultPatientId,
  );

  const defaultPatientName = defaultPatient.data
    ? fullName(defaultPatient.data)
    : undefined;
  useEffect(() => {
    if (defaultPatientName) setPatientQuery(defaultPatientName);
  }, [defaultPatientName]);

  const patientItems = patients.data?.items ?? [];
  const clinicItems = clinics.data?.items ?? [];
  const providerItems = providers.data?.items ?? [];
  useEffect(() => {
    lookups.current = {
      patients: patientItems,
      clinics: clinicItems,
      providers: providerItems,
    };
  });

  const date = dateTime.slice(0, 10);
  const { opening, latestStart } = appointmentTimeBounds(settings);
  const { errors, isSubmitting } = form.formState;

  const loadErrors = [
    { error: settingsError, retry: onRetrySettings },
    { error: patients.error, retry: () => void patients.refetch() },
    { error: clinics.error, retry: () => void clinics.refetch() },
    { error: providers.error, retry: () => void providers.refetch() },
  ].flatMap(({ error, retry }) =>
    error
      ? [
          {
            message: typeof error === "string" ? error : getErrorMessage(error),
            retry,
          },
        ]
      : [],
  );

  return (
    <>
      {loadErrors.map(({ message, retry }) => (
        <ErrorCallout key={message} message={message} onRetry={retry} />
      ))}

      <SearchSelectInput
        name="patientId"
        label="Patient"
        query={patientQuery}
        onQueryChange={setPatientQuery}
        searchPlaceholder="Search patients…"
        placeholder="Select a patient…"
        disabled={patients.isPending}
        options={patientItems.map((p) => ({
          value: p.id,
          label: fullName(p),
        }))}
      />
      <SearchSelectInput
        name="clinicId"
        label="Clinic"
        query={clinicQuery}
        onQueryChange={setClinicQuery}
        searchPlaceholder="Search clinics…"
        placeholder="Select a clinic…"
        disabled={clinics.isPending}
        options={clinicItems.map((c) => ({ value: c.id, label: c.name }))}
      />
      <SearchSelectInput
        name="providerId"
        label="Provider"
        query={providerQuery}
        onQueryChange={(text) => setProviderText({ clinicId, text })}
        searchPlaceholder="Search providers…"
        placeholder="Select a provider…"
        disabled={!clinicId || providers.isPending}
        options={providerItems.map((p) => ({
          value: p.id,
          label: `${fullName(p)} — ${p.specialty}`,
        }))}
      />

      <FormField
        label={
          settings
            ? `Date & time (${settings.appointmentDurationMinutes} minutes; ${settings.clinicOpeningTime.slice(0, 5)}–${settings.clinicClosingTime.slice(0, 5)})`
            : "Date & time"
        }
        htmlFor="appointment-datetime"
        error={errors.appointmentDateTime?.message}
      >
        <TextField.Root
          id="appointment-datetime"
          type="datetime-local"
          min={date && opening ? `${date}T${opening}` : undefined}
          max={date && latestStart ? `${date}T${latestStart}` : undefined}
          {...form.register("appointmentDateTime")}
        />
      </FormField>

      <TextAreaInput
        name="reasonForVisit"
        label="Reason for visit (optional)"
      />

      {appointment && onDelete && (
        <Button
          type="button"
          color="red"
          variant="soft"
          style={{ alignSelf: "flex-start" }}
          disabled={isSubmitting}
          onClick={() => onDelete(appointment)}
        >
          <TrashIcon />
          Delete appointment
        </Button>
      )}
    </>
  );
}

export function AppointmentFormDialog({
  open,
  onOpenChange,
  appointment,
  onSave,
  defaultDateTime,
  defaultPatientId,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AppointmentListItem | null;
  onSave: (
    input: AppointmentInput,
    editing: AppointmentListItem | null,
    overrides: Partial<AppointmentListItem>,
  ) => void;
  defaultDateTime?: string;
  defaultPatientId?: string;
  onDelete?: (appointment: AppointmentListItem) => void;
}) {
  const settingsQuery = useAppointmentSettings();
  const settings = settingsQuery.data;
  const lookups = useRef<Lookups>({ patients: [], clinics: [], providers: [] });
  const schema = useMemo(
    () =>
      appointmentForm(
        settings,
        (providerId) =>
          lookups.current.providers.find((p) => p.id === providerId)?.clinicId,
      ),
    [settings],
  );

  const save = (values: AppointmentFormValues) => {
    if (!settings)
      throw new Error("Appointment settings could not be loaded from the API.");
    const input: AppointmentInput = {
      patientId: values.patientId,
      providerId: values.providerId,
      appointmentDateTime: values.appointmentDateTime,
      reasonForVisit: values.reasonForVisit,
    };
    const patient = lookups.current.patients.find(
      (p) => p.id === values.patientId,
    );
    const clinic = lookups.current.clinics.find(
      (c) => c.id === values.clinicId,
    );
    const provider = lookups.current.providers.find(
      (p) => p.id === values.providerId,
    );
    const unchanged = (field: "patientId" | "clinicId") =>
      appointment?.[field] === values[field];
    onSave(input, appointment, {
      patientName: patient
        ? fullName(patient)
        : unchanged("patientId")
          ? appointment?.patientName
          : "",
      providerName: provider ? fullName(provider) : "",
      providerSpecialty: provider?.specialty ?? "",
      clinicId: values.clinicId,
      clinicName: clinic
        ? clinic.name
        : unchanged("clinicId")
          ? appointment?.clinicName
          : "",
    });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={appointment ? "Edit appointment" : "New appointment"}
      submitLabel={appointment ? "Save changes" : "Create appointment"}
      schema={schema}
      defaultValues={{
        patientId: appointment?.patientId ?? defaultPatientId ?? "",
        clinicId: appointment?.clinicId ?? "",
        providerId: appointment?.providerId ?? "",
        appointmentDateTime: appointment
          ? toDateTimeLocal(appointment.appointmentDateTime)
          : (defaultDateTime ?? ""),
        reasonForVisit: appointment?.reasonForVisit ?? "",
      }}
      onSubmit={save}
    >
      {(form) => (
        <AppointmentFields
          form={form}
          appointment={appointment}
          defaultPatientId={defaultPatientId}
          settings={settings}
          settingsError={
            settingsQuery.error ? getErrorMessage(settingsQuery.error) : null
          }
          onRetrySettings={() => void settingsQuery.refetch()}
          lookups={lookups}
          onDelete={onDelete}
        />
      )}
    </FormDialog>
  );
}
