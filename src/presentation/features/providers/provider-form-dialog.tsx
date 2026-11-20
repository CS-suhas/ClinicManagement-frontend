"use client";

import { Select, TextField } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { useService } from "@/di/container-provider";
import type { Clinic, Provider, ProviderInput } from "@/domain/entities";
import { FormDialog } from "@/presentation/components/form-dialog";
import { FormField } from "@/presentation/components/form-field";
import { useFormSubmit } from "@/presentation/hooks/use-form-submit";

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
  const providerService = useService("providerService");
  const { submitting, fieldErrors, formError, run, reset } = useFormSubmit();
  const [values, setValues] = useState<ProviderInput>(EMPTY);

  useEffect(() => {
    if (open) {
      reset();
      setValues(
        provider
          ? {
              clinicId: provider.clinicId,
              firstName: provider.firstName,
              lastName: provider.lastName,
              specialty: provider.specialty,
            }
          : EMPTY,
      );
    }
  }, [open, provider, reset]);

  const set =
    (field: "firstName" | "lastName" | "specialty") =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [field]: e.target.value }));

  const submit = async () => {
    const ok = await run(() =>
      provider
        ? providerService.update(provider.id, values)
        : providerService.create(values),
    );
    if (ok) {
      onOpenChange(false);
      onSaved();
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={provider ? "Edit provider" : "New provider"}
      submitLabel={provider ? "Save changes" : "Create provider"}
      submitting={submitting}
      formError={formError}
      onSubmit={submit}
    >
      <FormField
        label="First name"
        htmlFor="provider-first-name"
        error={fieldErrors.firstName}
      >
        <TextField.Root
          id="provider-first-name"
          value={values.firstName}
          onChange={set("firstName")}
        />
      </FormField>
      <FormField
        label="Last name"
        htmlFor="provider-last-name"
        error={fieldErrors.lastName}
      >
        <TextField.Root
          id="provider-last-name"
          value={values.lastName}
          onChange={set("lastName")}
        />
      </FormField>
      <FormField
        label="Specialty"
        htmlFor="provider-specialty"
        error={fieldErrors.specialty}
      >
        <TextField.Root
          id="provider-specialty"
          value={values.specialty}
          onChange={set("specialty")}
        />
      </FormField>
      <FormField
        label="Clinic"
        htmlFor="provider-clinic"
        error={fieldErrors.clinicId}
      >
        <Select.Root
          value={values.clinicId || undefined}
          onValueChange={(clinicId) => setValues((v) => ({ ...v, clinicId }))}
        >
          <Select.Trigger id="provider-clinic" placeholder="Select a clinic" />
          <Select.Content>
            {clinics.map((c) => (
              <Select.Item key={c.id} value={c.id}>
                {c.name}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </FormField>
    </FormDialog>
  );
}
