"use client";

import { FormDialog, TextInput } from "@/components/form";
import { useSaveClinic } from "../api";
import { type Clinic, clinicForm } from "../schemas";

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
      title={clinic ? "Edit clinic" : "New clinic"}
      submitLabel={clinic ? "Save changes" : "Create clinic"}
      schema={clinicForm}
      defaultValues={{
        name: clinic?.name ?? "",
        address: clinic?.address ?? "",
        phoneNumber: clinic?.phoneNumber ?? "",
      }}
      onSubmit={(values) => save.mutateAsync({ id: clinic?.id, values })}
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
