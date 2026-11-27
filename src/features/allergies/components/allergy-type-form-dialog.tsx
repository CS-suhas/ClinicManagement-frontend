"use client";

import { FormDialog, TextInput } from "@/components/form";
import { useSaveAllergyType } from "../api";
import { type AllergyType, allergyTypeForm } from "../schemas";

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
      title={allergyType ? "Edit allergy" : "New allergy"}
      submitLabel={allergyType ? "Save changes" : "Create allergy"}
      schema={allergyTypeForm}
      defaultValues={{ name: allergyType?.name ?? "" }}
      onSubmit={(values) => save.mutateAsync({ id: allergyType?.id, values })}
    >
      <TextInput name="name" label="Allergy name" />
    </FormDialog>
  );
}
