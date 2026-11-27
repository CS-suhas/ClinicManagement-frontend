"use client";

import { FormDialog } from "@/components/form-dialog";
import { TextFormField } from "@/components/form-fields";
import type { AllergyType, AllergyTypeInput } from "@/domain/entities";
import { useEntityForm } from "@/hooks/use-entity-form";

const EMPTY: AllergyTypeInput = { name: "" };

/** Create when `allergyType` is null, edit otherwise. */
export function AllergyTypeFormDialog({
  open,
  onOpenChange,
  allergyType,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allergyType: AllergyType | null;
  onSave: (input: AllergyTypeInput, editing: AllergyType | null) => void;
}) {
  const form = useEntityForm({
    entityName: "allergy",
    idPrefix: "allergy",
    open,
    onOpenChange,
    onSave,
    entity: allergyType,
    empty: EMPTY,
  });

  return (
    <FormDialog {...form.dialogProps}>
      <TextFormField label="Allergy name" {...form.field("name")} />
    </FormDialog>
  );
}
