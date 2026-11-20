"use client";

import { TextField } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { useService } from "@/di/container-provider";
import type { Clinic, ClinicInput } from "@/domain/entities";
import { FormDialog } from "@/presentation/components/form-dialog";
import { FormField } from "@/presentation/components/form-field";
import { useFormSubmit } from "@/presentation/hooks/use-form-submit";

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
  const clinicService = useService("clinicService");
  const { submitting, fieldErrors, formError, run, reset } = useFormSubmit();
  const [values, setValues] = useState<ClinicInput>(EMPTY);

  useEffect(() => {
    if (open) {
      reset();
      setValues(
        clinic
          ? {
              name: clinic.name,
              location: clinic.location,
              phoneNumber: clinic.phoneNumber,
            }
          : EMPTY,
      );
    }
  }, [open, clinic, reset]);

  const set =
    (field: keyof ClinicInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [field]: e.target.value }));

  const submit = async () => {
    const ok = await run(() =>
      clinic
        ? clinicService.update(clinic.id, values)
        : clinicService.create(values),
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
      title={clinic ? "Edit clinic" : "New clinic"}
      submitLabel={clinic ? "Save changes" : "Create clinic"}
      submitting={submitting}
      formError={formError}
      onSubmit={submit}
    >
      <FormField label="Name" htmlFor="clinic-name" error={fieldErrors.name}>
        <TextField.Root
          id="clinic-name"
          value={values.name}
          onChange={set("name")}
        />
      </FormField>
      <FormField
        label="Location (optional)"
        htmlFor="clinic-location"
        error={fieldErrors.location}
      >
        <TextField.Root
          id="clinic-location"
          value={values.location ?? ""}
          onChange={(e) =>
            setValues((v) => ({ ...v, location: e.target.value || null }))
          }
        />
      </FormField>
      <FormField
        label="Phone number (optional)"
        htmlFor="clinic-phone"
        error={fieldErrors.phoneNumber}
      >
        <TextField.Root
          id="clinic-phone"
          type="tel"
          value={values.phoneNumber}
          onChange={set("phoneNumber")}
        />
      </FormField>
    </FormDialog>
  );
}
