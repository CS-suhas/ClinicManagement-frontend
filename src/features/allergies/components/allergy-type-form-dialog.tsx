"use client";

import { FormDialog, TextInput } from "@/components/form";
import { useSaveAllergyType } from "../api";
import {
  type AllergyType,
  allergyTypeDefaults,
  allergyTypeForm,
} from "../schemas";

export function AllergyTypeFormDialog({
  open,
  onOpenChange,
  allergyType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allergyType: AllergyType | null;
}) {
  const save = useSaveAllergyType();

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      noun="allergy"
      entity={allergyType}
      defaults={allergyTypeDefaults}
      schema={allergyTypeForm}
      onSubmit={(values) => save(allergyType?.id, values)}
    >
      <TextInput name="name" label="Allergy name" />
    </FormDialog>
  );
}
