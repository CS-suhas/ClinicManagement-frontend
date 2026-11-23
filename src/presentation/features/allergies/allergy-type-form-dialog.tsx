"use client";

import { useService } from "@/di/container-provider";
import type { AllergyType, AllergyTypeInput } from "@/domain/entities";
import { FormDialog } from "@/presentation/components/form-dialog";
import { TextFormField } from "@/presentation/components/form-fields";
import { useEntityForm } from "@/presentation/hooks/use-entity-form";

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
  const form = useEntityForm({
    entityName: "allergy",
    idPrefix: "allergy",
    open,
    onOpenChange,
    onSaved,
    entity: allergyType,
    empty: EMPTY,
    service: useService("allergyTypeService"),
  });

  return (
    <FormDialog {...form.dialogProps}>
      <TextFormField label="Allergy name" {...form.field("name")} />
    </FormDialog>
  );
}
