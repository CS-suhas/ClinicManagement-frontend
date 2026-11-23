"use client";

import type { Clinic, Provider, ProviderInput } from "@/domain/entities";
import { FormDialog } from "@/presentation/components/form-dialog";
import {
  SelectFormField,
  TextFormField,
} from "@/presentation/components/form-fields";
import { useEntityForm } from "@/presentation/hooks/use-entity-form";

const EMPTY: ProviderInput = {
  clinicId: "",
  firstName: "",
  lastName: "",
  specialty: "",
};

/** Create when `provider` is null, edit otherwise. */
export function ProviderFormDialog({
  open,
  onOpenChange,
  provider,
  clinics,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: Provider | null;
  clinics: Clinic[];
  onSave: (input: ProviderInput, editing: Provider | null) => void;
}) {
  const form = useEntityForm({
    entityName: "provider",
    idPrefix: "provider",
    open,
    onOpenChange,
    onSave,
    entity: provider,
    empty: EMPTY,
  });

  return (
    <FormDialog {...form.dialogProps}>
      <TextFormField label="First name" {...form.field("firstName")} />
      <TextFormField label="Last name" {...form.field("lastName")} />
      <TextFormField label="Specialty" {...form.field("specialty")} />
      <SelectFormField
        label="Clinic"
        placeholder="Select a clinic"
        options={clinics.map((c) => ({ value: c.id, label: c.name }))}
        {...form.selectField("clinicId")}
      />
    </FormDialog>
  );
}
