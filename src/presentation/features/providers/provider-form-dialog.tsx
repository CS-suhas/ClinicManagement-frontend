"use client";

import { useService } from "@/di/container-provider";
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
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: Provider | null;
  clinics: Clinic[];
  onSaved: () => void;
}) {
  const form = useEntityForm({
    entityName: "provider",
    idPrefix: "provider",
    open,
    onOpenChange,
    onSaved,
    entity: provider,
    empty: EMPTY,
    service: useService("providerService"),
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
