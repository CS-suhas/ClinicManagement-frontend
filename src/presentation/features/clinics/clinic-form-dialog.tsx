"use client";

import { useService } from "@/di/container-provider";
import type { Clinic, ClinicInput } from "@/domain/entities";
import { FormDialog } from "@/presentation/components/form-dialog";
import { TextFormField } from "@/presentation/components/form-fields";
import { useEntityForm } from "@/presentation/hooks/use-entity-form";

const EMPTY: ClinicInput = { name: "", location: null, phoneNumber: "" };

/** Create when `clinic` is null, edit otherwise. */
export function ClinicFormDialog({
  open,
  onOpenChange,
  clinic,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinic: Clinic | null;
  onSaved: () => void;
}) {
  const form = useEntityForm({
    entityName: "clinic",
    idPrefix: "clinic",
    open,
    onOpenChange,
    onSaved,
    entity: clinic,
    empty: EMPTY,
    service: useService("clinicService"),
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
