"use client";

import { TrashIcon } from "@radix-ui/react-icons";
import { Button, TextField } from "@radix-ui/themes";
import { patientFullName, providerFullName } from "@/domain/entities";
import type { AppointmentListItem } from "@/domain/repositories";
import { ErrorCallout } from "@/presentation/components/error-callout";
import { FormDialog } from "@/presentation/components/form-dialog";
import { FormField } from "@/presentation/components/form-field";
import {
  SearchSelectField,
  TextAreaFormField,
} from "@/presentation/components/form-fields";
import {
  type UseAppointmentFormOptions,
  useAppointmentForm,
} from "./use-appointment-form";

/** Create when `appointment` is null, edit otherwise. */
export function AppointmentFormDialog({
  open,
  onOpenChange,
  appointment,
  onSave,
  defaultDateTime,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AppointmentListItem | null;
  onSave: UseAppointmentFormOptions["onSave"];
  defaultDateTime?: string;
  /** Adds a delete button when editing. The caller confirms the delete. */
  onDelete?: (appointment: AppointmentListItem) => void;
}) {
  const form = useAppointmentForm({
    open,
    onOpenChange,
    appointment,
    onSave,
    defaultDateTime,
  });
  const { values, fieldErrors, settings, patients, clinics, providers } = form;

  return (
    <FormDialog {...form.dialogProps}>
      {form.loadErrors.map(({ message, retry }) => (
        <ErrorCallout
          key={message}
          message={message}
          onRetry={() => void retry()}
        />
      ))}

      <SearchSelectField
        label="Patient"
        id="appointment-patient"
        error={fieldErrors.patientId}
        query={patients.query}
        onQueryChange={patients.setQuery}
        searchPlaceholder="Search patients…"
        placeholder="Select a patient…"
        disabled={patients.loading}
        value={values.patientId}
        onValueChange={(v) => form.setValue("patientId", v)}
        options={patients.items.map((p) => ({
          value: p.id,
          label: patientFullName(p),
        }))}
      />
      <SearchSelectField
        label="Clinic"
        id="appointment-clinic"
        error={fieldErrors.clinicId}
        query={clinics.query}
        onQueryChange={clinics.setQuery}
        searchPlaceholder="Search clinics…"
        placeholder="Select a clinic…"
        disabled={clinics.loading}
        value={values.clinicId}
        onValueChange={form.selectClinic}
        options={clinics.items.map((c) => ({ value: c.id, label: c.name }))}
      />
      <SearchSelectField
        label="Provider"
        id="appointment-provider"
        error={fieldErrors.providerId}
        query={providers.query}
        onQueryChange={providers.setQuery}
        searchPlaceholder="Search providers…"
        placeholder="Select a provider…"
        disabled={!values.clinicId || providers.loading}
        value={values.providerId}
        onValueChange={(v) => form.setValue("providerId", v)}
        options={providers.items.map((p) => ({
          value: p.id,
          label: `${providerFullName(p)} — ${p.specialty}`,
        }))}
      />

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
          min={form.timeBounds.min}
          max={form.timeBounds.max}
          value={values.appointmentDateTime}
          onChange={(e) => form.setValue("appointmentDateTime", e.target.value)}
        />
      </FormField>

      <TextAreaFormField
        label="Reason for visit (optional)"
        id="appointment-reason"
        error={fieldErrors.reasonForVisit}
        value={values.reasonForVisit}
        onChange={(e) => form.setValue("reasonForVisit", e.target.value)}
      />

      {appointment && onDelete && (
        <Button
          type="button"
          color="red"
          variant="soft"
          style={{ alignSelf: "flex-start" }}
          disabled={form.dialogProps.submitting}
          onClick={() => onDelete(appointment)}
        >
          <TrashIcon />
          Delete appointment
        </Button>
      )}
    </FormDialog>
  );
}
