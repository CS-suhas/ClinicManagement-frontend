"use client";

import type { Option } from "@/components/form";
import {
  FormDialog,
  NumberInput,
  SelectInput,
  TextInput,
} from "@/components/form";
import { useSaveProvider } from "../api";
import {
  ProviderGender as GenderSchema,
  type Provider,
  type ProviderGender,
  providerForm,
  providerGenderLabels,
} from "../schemas";

const genderOptions: Option[] = GenderSchema.options.map(
  (g: ProviderGender) => ({
    value: g,
    label: providerGenderLabels[g],
  }),
);

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
      title={provider ? "Edit provider" : "New provider"}
      submitLabel={provider ? "Save changes" : "Create provider"}
      schema={providerForm}
      defaultValues={{
        clinicId: provider?.clinicId ?? "",
        firstName: provider?.firstName ?? "",
        lastName: provider?.lastName ?? "",
        specialty: provider?.specialty ?? "",
        fee: provider?.fee ?? null,
        gender: provider?.gender ?? null,
      }}
      onSubmit={(values) => save.mutateAsync({ id: provider?.id, values })}
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
