"use client";

import { TextField } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { useService } from "@/di/container-provider";
import type { AllergyType, AllergyTypeInput } from "@/domain/entities";
import { FormDialog } from "@/presentation/components/form-dialog";
import { FormField } from "@/presentation/components/form-field";
import { useFormSubmit } from "@/presentation/hooks/use-form-submit";

const EMPTY: AllergyTypeInput = { name: "" };

/** Create when `allergyType` is null, edit otherwise. */
export function AllergyTypeFormDialog({
  open,
  onOpenChange,
  allergyType,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allergyType: AllergyType | null;
  onSaved: () => void;
}) {
  const allergyTypeService = useService("allergyTypeService");
  const { submitting, fieldErrors, formError, run, reset } = useFormSubmit();
  const [values, setValues] = useState<AllergyTypeInput>(EMPTY);

  useEffect(() => {
    if (open) {
      reset();
      setValues(allergyType ? { name: allergyType.name } : EMPTY);
    }
  }, [open, allergyType, reset]);

  const submit = async () => {
    const ok = await run(() =>
      allergyType
        ? allergyTypeService.update(allergyType.id, values)
        : allergyTypeService.create(values),
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
      title={allergyType ? "Edit allergy" : "New allergy"}
      submitLabel={allergyType ? "Save changes" : "Create allergy"}
      submitting={submitting}
      formError={formError}
      onSubmit={submit}
    >
      <FormField
        label="Allergy name"
        htmlFor="allergy-name"
        error={fieldErrors.name}
      >
        <TextField.Root
          id="allergy-name"
          value={values.name}
          onChange={(e) => setValues({ name: e.target.value })}
        />
      </FormField>
    </FormDialog>
  );
}
