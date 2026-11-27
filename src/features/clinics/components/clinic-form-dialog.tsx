"use client";

import { FormDialog, TextInput } from "@/components/form";
import { useSaveClinic } from "../api";
import { type Clinic, clinicDefaults, clinicForm } from "../schemas";

export function ClinicFormDialog({
  open,
  onOpenChange,
  clinic,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinic: Clinic | null;
}) {
  const save = useSaveClinic();

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      noun="clinic"
      entity={clinic}
      defaults={clinicDefaults}
      schema={clinicForm}
      onSubmit={(values) => save(clinic?.id, values)}
    >
      <TextInput name="name" label="Name" />
      <TextInput name="address" label="Location (optional)" />
      <TextInput
        name="phoneNumber"
        label="Phone number (optional)"
        type="tel"
      />
    </FormDialog>
  );
}
