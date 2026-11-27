"use client";

import { Grid } from "@radix-ui/themes";
import { FormDialog, TextInput } from "@/components/form";
import { useSavePatient } from "../api";
import { type Patient, patientDefaults, patientForm } from "../schemas";

export function PatientFormDialog({
  open,
  onOpenChange,
  patient,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
}) {
  const save = useSavePatient();

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      noun="patient"
      entity={patient}
      defaults={patientDefaults}
      schema={patientForm}
      onSubmit={(values) => save(patient?.id, values)}
    >
      <Grid columns="2" gap="3">
        <TextInput name="firstName" label="First name" />
        <TextInput name="lastName" label="Last name" />
      </Grid>
      <TextInput name="dateOfBirth" label="Date of birth" type="date" />
      <TextInput name="email" label="Email" type="email" />
      <TextInput name="phoneNumber" label="Phone number" type="tel" />
    </FormDialog>
  );
}
