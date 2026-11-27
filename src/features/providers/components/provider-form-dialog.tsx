"use client";

import {
  FormDialog,
  NumberInput,
  optionsFrom,
  SelectInput,
  TextInput,
} from "@/components/form";
import { useSaveProvider } from "../api";
import {
  type Provider,
  providerDefaults,
  providerForm,
  providerGenderLabels,
} from "../schemas";

const genderOptions = optionsFrom(providerGenderLabels);

export function ProviderFormDialog({
  open,
  onOpenChange,
  provider,
  clinics,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: Provider | null;
  clinics: { id: string; name: string }[];
}) {
  const save = useSaveProvider();

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      noun="provider"
      entity={provider}
      defaults={providerDefaults}
      schema={providerForm}
      onSubmit={(values) => save(provider?.id, values)}
    >
      <TextInput name="firstName" label="First name" />
      <TextInput name="lastName" label="Last name" />
      <TextInput name="specialty" label="Specialty" />
      <SelectInput
        name="clinicId"
        label="Clinic"
        placeholder="Select a clinic"
        options={clinics.map((c) => ({ value: c.id, label: c.name }))}
      />
      <NumberInput name="fee" label="Fee" min={0} step={0.01} />
      <SelectInput
        name="gender"
        label="Gender"
        options={genderOptions}
        noneLabel="Not specified"
      />
    </FormDialog>
  );
}
