"use client";

import { FormDialog } from "@/components/form-dialog";
import { TextFormField } from "@/components/form-fields";
import type { Clinic, ClinicInput } from "@/domain/entities";
import { useEntityForm } from "@/hooks/use-entity-form";

const EMPTY: ClinicInput = { name: "", location: null, phoneNumber: "" };

/** Create when `clinic` is null, edit otherwise. */
export function ClinicFormDialog({
  open,
  onOpenChange,
  clinic,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinic: Clinic | null;
  onSave: (input: ClinicInput, editing: Clinic | null) => void;
}) {
  const form = useEntityForm({
    entityName: "clinic",
    idPrefix: "clinic",
    open,
    onOpenChange,
    onSave,
    entity: clinic,
    empty: EMPTY,
  });

  return (
    <FormDialog {...form.dialogProps}>
      <TextFormField label="Name" {...form.field("name")} />
      <TextFormField
        label="Location (optional)"
        {...form.field("location", { emptyAsNull: true })}
      />
      <TextFormField
        label="Phone number (optional)"
        type="tel"
        {...form.field("phoneNumber")}
      />
    </FormDialog>
  );
}
