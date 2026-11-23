"use client";

import { Select, TextArea, TextField } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { useService } from "@/di/container-provider";
import type {
  AppointmentInput,
  Clinic,
  Patient,
  Provider,
} from "@/domain/entities";
import {
  patientFullName,
  providerFullName,
  validateAppointmentSchedule,
} from "@/domain/entities";
import { assertValid } from "@/domain/errors";
import type { AppointmentListItem } from "@/domain/repositories";
import { ErrorCallout } from "@/presentation/components/error-callout";
import { FormDialog } from "@/presentation/components/form-dialog";
import { FormField } from "@/presentation/components/form-field";
import { SearchField } from "@/presentation/components/search-field";
import { useAsyncData } from "@/presentation/hooks/use-async-data";
import { useFormSubmit } from "@/presentation/hooks/use-form-submit";
import { usePagedSearch } from "@/presentation/hooks/use-paged-search";
import { toDateTimeLocal } from "@/presentation/lib/format";

const EMPTY: AppointmentInput = {
  patientId: "",
  providerId: "",
  appointmentDateTime: "",
  reasonForVisit: "",
};

interface AppointmentFormValues extends AppointmentInput {
  clinicId: string;
}

const EMPTY_PAGE = { items: [], totalCount: 0, page: 1, pageSize: 100 };

/** Create when `appointment` is null, edit otherwise. */
export function AppointmentFormDialog({
  open,
  onOpenChange,
  appointment,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AppointmentListItem | null;
  onSaved: () => void;
}) {
  const appointmentService = useService("appointmentService");
  const patientService = useService("patientService");
  const providerService = useService("providerService");
  const clinicService = useService("clinicService");
  const configurationService = useService("configurationService");
  const { submitting, fieldErrors, formError, run, reset } = useFormSubmit();
  const {
    query: patientQuery,
    search: patientSearchTerm,
    setQueryNow: setPatientQuery,
  } = usePagedSearch();
  const {
    query: clinicQuery,
    search: clinicSearchTerm,
    setQueryNow: setClinicQuery,
  } = usePagedSearch();
  const {
    query: providerQuery,
    search: providerSearchTerm,
    setQueryNow: setProviderQuery,
  } = usePagedSearch();
  const [optionsReady, setOptionsReady] = useState(false);
  const [values, setValues] = useState<AppointmentFormValues>({
    ...EMPTY,
    clinicId: "",
  });

  const {
    data: settings,
    error: settingsError,
    reload: reloadSettings,
  } = useAsyncData(
    () =>
      open && optionsReady
        ? configurationService.getAppointmentSettings()
        : Promise.resolve(undefined),
    `${open}|${optionsReady}`,
  );
  const {
    data: patientPage,
    error: patientsError,
    loading: patientsLoading,
    reload: reloadPatients,
  } = useAsyncData(
    () =>
      open && optionsReady
        ? patientService.search({
            search: patientSearchTerm || undefined,
            page: 1,
            pageSize: 100,
          })
        : Promise.resolve(EMPTY_PAGE),
    `${open}|${optionsReady}|${patientSearchTerm}`,
  );
  const {
    data: clinicPage,
    error: clinicsError,
    loading: clinicsLoading,
    reload: reloadClinics,
  } = useAsyncData(
    () =>
      open && optionsReady
        ? clinicService.search({
            search: clinicSearchTerm || undefined,
            page: 1,
            pageSize: 100,
          })
        : Promise.resolve({ ...EMPTY_PAGE, items: [] as Clinic[] }),
    `${open}|${optionsReady}|${clinicSearchTerm}`,
  );
  const {
    data: providerPage,
    error: providersError,
    loading: providersLoading,
    reload: reloadProviders,
  } = useAsyncData(
    () =>
      open && optionsReady && values.clinicId
        ? providerService.search({
            clinicId: values.clinicId,
            search: providerSearchTerm || undefined,
            page: 1,
            pageSize: 100,
          })
        : Promise.resolve({ ...EMPTY_PAGE, items: [] as Provider[] }),
    `${open}|${optionsReady}|${values.clinicId}|${providerSearchTerm}`,
  );

  useEffect(() => {
    if (!open) {
      setOptionsReady(false);
      setPatientQuery("");
      setClinicQuery("");
      setProviderQuery("");
      setValues({ ...EMPTY, clinicId: "" });
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
            reasonForVisit: appointment.reasonForVisit,
          }
        : { ...EMPTY, clinicId: "" },
    );
    setOptionsReady(true);
  }, [
    open,
    appointment,
    reset,
    setPatientQuery,
    setClinicQuery,
    setProviderQuery,
  ]);

  const patients: Patient[] = patientPage?.items ?? [];
  const clinics: Clinic[] = clinicPage?.items ?? [];
  const providers: Provider[] = providerPage?.items ?? [];

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
      const provider = providers.find((item) => item.id === values.providerId);
      if (!values.clinicId) errors.clinicId = "Clinic is required";
      else if (!provider || provider.clinicId !== values.clinicId)
        errors.providerId = "Select a provider from the selected clinic";
      assertValid(errors);
      if (appointment) await appointmentService.update(appointment.id, input);
      else await appointmentService.create(input);
    });
    if (ok) {
      onOpenChange(false);
      onSaved();
    }
  };

  const date = values.appointmentDateTime.slice(0, 10);
  const openingTime = settings?.clinicOpeningTime.slice(0, 5);
  const closingMinutes = settings
    ? settings.clinicClosingTime
        .slice(0, 5)
        .split(":")
        .reduce((minutes, part) => minutes * 60 + Number(part), 0) -
      settings.appointmentDurationMinutes
    : undefined;
  const closingTime =
    closingMinutes !== undefined && closingMinutes >= 0
      ? `${String(Math.floor(closingMinutes / 60)).padStart(2, "0")}:${String(closingMinutes % 60).padStart(2, "0")}`
      : undefined;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={appointment ? "Edit appointment" : "New appointment"}
      submitLabel={appointment ? "Save changes" : "Create appointment"}
      submitting={submitting}
      formError={formError}
      onSubmit={submit}
    >
      {settingsError && (
        <ErrorCallout
          message={settingsError}
          onRetry={() => void reloadSettings()}
        />
      )}
      {patientsError && (
        <ErrorCallout
          message={patientsError}
          onRetry={() => void reloadPatients()}
        />
      )}
      {clinicsError && (
        <ErrorCallout
          message={clinicsError}
          onRetry={() => void reloadClinics()}
        />
      )}
      {providersError && (
        <ErrorCallout
          message={providersError}
          onRetry={() => void reloadProviders()}
        />
      )}
      <FormField
        label="Patient"
        htmlFor="appointment-patient"
        error={fieldErrors.patientId}
      >
        <SearchField
          value={patientQuery}
          onChange={setPatientQuery}
          placeholder="Search patients…"
        />
        <Select.Root
          value={values.patientId}
          disabled={patientsLoading}
          onValueChange={(v) => setValues((s) => ({ ...s, patientId: v }))}
        >
          <Select.Trigger
            id="appointment-patient"
            placeholder="Select a patient…"
            style={{ width: "100%" }}
          />
          <Select.Content>
            {patients.map((p) => (
              <Select.Item key={p.id} value={p.id}>
                {patientFullName(p)}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </FormField>

      <FormField
        label="Clinic"
        htmlFor="appointment-clinic"
        error={fieldErrors.clinicId}
      >
        <SearchField
          value={clinicQuery}
          onChange={setClinicQuery}
          placeholder="Search clinics…"
        />
        <Select.Root
          value={values.clinicId}
          disabled={clinicsLoading}
          onValueChange={(clinicId) => {
            setValues((current) => ({ ...current, clinicId, providerId: "" }));
            setProviderQuery("");
          }}
        >
          <Select.Trigger
            id="appointment-clinic"
            placeholder="Select a clinic…"
            style={{ width: "100%" }}
          />
          <Select.Content>
            {clinics.map((clinic) => (
              <Select.Item key={clinic.id} value={clinic.id}>
                {clinic.name}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </FormField>

      <FormField
        label="Provider"
        htmlFor="appointment-provider"
        error={fieldErrors.providerId}
      >
        <SearchField
          value={providerQuery}
          onChange={setProviderQuery}
          placeholder="Search providers…"
        />
        <Select.Root
          value={values.providerId}
          disabled={!values.clinicId || providersLoading}
          onValueChange={(v) => setValues((s) => ({ ...s, providerId: v }))}
        >
          <Select.Trigger
            id="appointment-provider"
            placeholder="Select a provider…"
            style={{ width: "100%" }}
          />
          <Select.Content>
            {providers.map((p) => (
              <Select.Item key={p.id} value={p.id}>
                {`${providerFullName(p)} — ${p.specialty}`}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </FormField>

      <FormField
        label={
          settings
            ? `Date & time (${settings.appointmentDurationMinutes} minutes; ${settings.clinicOpeningTime.slice(0, 5)}–${settings.clinicClosingTime.slice(0, 5)})`
            : "Date & time"
        }
        htmlFor="appointment-datetime"
        error={fieldErrors.appointmentDateTime}
      >
        <TextField.Root
          id="appointment-datetime"
          type="datetime-local"
          min={date && openingTime ? `${date}T${openingTime}` : undefined}
          max={date && closingTime ? `${date}T${closingTime}` : undefined}
          value={values.appointmentDateTime}
          onChange={(e) =>
            setValues((s) => ({ ...s, appointmentDateTime: e.target.value }))
          }
        />
      </FormField>

      <FormField
        label="Reason for visit (optional)"
        htmlFor="appointment-reason"
        error={fieldErrors.reasonForVisit}
      >
        <TextArea
          id="appointment-reason"
          value={values.reasonForVisit}
          onChange={(e) =>
            setValues((s) => ({ ...s, reasonForVisit: e.target.value }))
          }
        />
      </FormField>
    </FormDialog>
  );
}
