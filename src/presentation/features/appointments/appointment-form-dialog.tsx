"use client";

import { Select, TextArea, TextField } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { useService } from "@/di/container-provider";
import type {
  Appointment,
  AppointmentInput,
  AppointmentSettings,
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
import { FormDialog } from "@/presentation/components/form-dialog";
import { FormField } from "@/presentation/components/form-field";
import { useFormSubmit } from "@/presentation/hooks/use-form-submit";
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

/** Create when `appointment` is null, edit otherwise. */
export function AppointmentFormDialog({
  open,
  onOpenChange,
  appointment,
  patients,
  providers,
  clinics,
  appointments,
  settings,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  patients: Patient[];
  providers: Provider[];
  clinics: Clinic[];
  appointments: Appointment[];
  settings: AppointmentSettings | undefined;
  onSaved: () => void;
}) {
  const appointmentService = useService("appointmentService");
  const { submitting, fieldErrors, formError, run, reset } = useFormSubmit();
  const [values, setValues] = useState<AppointmentFormValues>({
    ...EMPTY,
    clinicId: "",
  });

  useEffect(() => {
    if (open) {
      reset();
      const clinicId = providers.find(
        (provider) => provider.id === appointment?.providerId,
      )?.clinicId;
      setValues(
        appointment
          ? {
              clinicId: clinicId ?? "",
              patientId: appointment.patientId,
              providerId: appointment.providerId,
              appointmentDateTime: toDateTimeLocal(
                appointment.appointmentDateTime,
              ),
              reasonForVisit: appointment.reasonForVisit,
            }
          : { ...EMPTY, clinicId: "" },
      );
    }
  }, [open, appointment, providers, reset]);

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
        appointments,
        appointment?.id,
      );
      const provider = providers.find((item) => item.id === values.providerId);
      if (!values.clinicId) errors.clinicId = "Clinic is required";
      else if (provider && provider.clinicId !== values.clinicId)
        errors.providerId = "Provider must belong to the selected clinic";
      assertValid(errors);
      if (appointment) await appointmentService.update(appointment.id, input);
      else await appointmentService.create(input);
    });
    if (ok) {
      onOpenChange(false);
      onSaved();
    }
  };

  const availableProviders = providers.filter(
    (provider) => provider.clinicId === values.clinicId,
  );
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
      <FormField
        label="Patient"
        htmlFor="appointment-patient"
        error={fieldErrors.patientId}
      >
        <Select.Root
          value={values.patientId}
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
        <Select.Root
          value={values.clinicId}
          onValueChange={(clinicId) =>
            setValues((current) => ({ ...current, clinicId, providerId: "" }))
          }
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
        <Select.Root
          value={values.providerId}
          disabled={!values.clinicId}
          onValueChange={(v) => setValues((s) => ({ ...s, providerId: v }))}
        >
          <Select.Trigger
            id="appointment-provider"
            placeholder="Select a provider…"
            style={{ width: "100%" }}
          />
          <Select.Content>
            {availableProviders.map((p) => (
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
