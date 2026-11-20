"use client";

import { Grid, TextField } from "@radix-ui/themes";
import { type ChangeEvent, useEffect, useState } from "react";
import { useService } from "@/di/container-provider";
import type { Patient, PatientInput } from "@/domain/entities";
import { FormDialog } from "@/presentation/components/form-dialog";
import { FormField } from "@/presentation/components/form-field";
import { useFormSubmit } from "@/presentation/hooks/use-form-submit";

const EMPTY: PatientInput = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  email: "",
  phoneNumber: "",
};

/** Create when `patient` is null, edit otherwise. */
export function PatientFormDialog({
  open,
  onOpenChange,
  patient,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
  onSaved: () => void;
}) {
  const patientService = useService("patientService");
  const { submitting, fieldErrors, formError, run, reset } = useFormSubmit();
  const [values, setValues] = useState<PatientInput>(EMPTY);

  useEffect(() => {
    if (open) {
      reset();
      setValues(
        patient
          ? {
              firstName: patient.firstName,
              lastName: patient.lastName,
              dateOfBirth: patient.dateOfBirth,
              email: patient.email,
              phoneNumber: patient.phoneNumber,
            }
          : EMPTY,
      );
    }
  }, [open, patient, reset]);

  const set =
    (field: keyof PatientInput) => (e: ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [field]: e.target.value }));

  const submit = async () => {
    const ok = await run(() =>
      patient
        ? patientService.update(patient.id, values)
        : patientService.create(values),
    );
    if (ok) {
      onOpenChange(false);
      onSaved();
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={patient ? "Edit patient" : "New patient"}
      submitLabel={patient ? "Save changes" : "Create patient"}
      submitting={submitting}
      formError={formError}
      onSubmit={submit}
    >
      <Grid columns="2" gap="3">
        <FormField
          label="First name"
          htmlFor="patient-first-name"
          error={fieldErrors.firstName}
        >
          <TextField.Root
            id="patient-first-name"
            value={values.firstName}
            onChange={set("firstName")}
          />
        </FormField>
        <FormField
          label="Last name"
          htmlFor="patient-last-name"
          error={fieldErrors.lastName}
        >
          <TextField.Root
            id="patient-last-name"
            value={values.lastName}
            onChange={set("lastName")}
          />
        </FormField>
      </Grid>
      <FormField
        label="Date of birth"
        htmlFor="patient-dob"
        error={fieldErrors.dateOfBirth}
      >
        <TextField.Root
          id="patient-dob"
          type="date"
          value={values.dateOfBirth}
          onChange={set("dateOfBirth")}
        />
      </FormField>
      <FormField
        label="Email"
        htmlFor="patient-email"
        error={fieldErrors.email}
      >
        <TextField.Root
          id="patient-email"
          type="email"
          value={values.email}
          onChange={set("email")}
        />
      </FormField>
      <FormField
        label="Phone number"
        htmlFor="patient-phone"
        error={fieldErrors.phoneNumber}
      >
        <TextField.Root
          id="patient-phone"
          type="tel"
          value={values.phoneNumber}
          onChange={set("phoneNumber")}
        />
      </FormField>
    </FormDialog>
  );
}
