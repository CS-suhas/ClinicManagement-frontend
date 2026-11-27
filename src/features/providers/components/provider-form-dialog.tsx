"use client";

import { FormDialog } from "@/components/form-dialog";
import { SelectFormField, TextFormField } from "@/components/form-fields";
import {
  type Clinic,
  PROVIDER_GENDER_LABELS,
  PROVIDER_GENDERS,
  type Provider,
  type ProviderInput,
} from "@/domain/entities";
import { useEntityForm } from "@/hooks/use-entity-form";

const EMPTY: ProviderInput = {
  clinicId: "",
  firstName: "",
  lastName: "",
  specialty: "",
  fee: null,
  gender: null,
};

/** Radix selects cannot use "" as an item value, so "not set" gets a sentinel. */
const NOT_SPECIFIED = "NOT_SPECIFIED";
const GENDER_OPTIONS = [
  { value: NOT_SPECIFIED, label: "Not specified" },
  ...PROVIDER_GENDERS.map((g) => ({
    value: g,
    label: PROVIDER_GENDER_LABELS[g],
  })),
];

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
      <TextFormField
        label="Fee"
        type="number"
        min={0}
        step={0.01}
        {...form.numberField("fee")}
      />
      <SelectFormField
        label="Gender"
        options={GENDER_OPTIONS}
        {...form.nullableSelectField("gender", NOT_SPECIFIED)}
      />
    </FormDialog>
  );
}
