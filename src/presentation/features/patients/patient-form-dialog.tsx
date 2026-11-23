"use client";

import { Grid } from "@radix-ui/themes";
import { useService } from "@/di/container-provider";
import type { Patient, PatientInput } from "@/domain/entities";
import { FormDialog } from "@/presentation/components/form-dialog";
import { TextFormField } from "@/presentation/components/form-fields";
import { useEntityForm } from "@/presentation/hooks/use-entity-form";

const EMPTY: PatientInput = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  email: "",
  phoneNumber: "",
};

/** Create when `patient` is null, edit otherwise. */
export function PatientFormDialog({
  open,
  onOpenChange,
  patient,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
  onSaved: () => void;
}) {
  const form = useEntityForm({
    entityName: "patient",
    idPrefix: "patient",
    open,
    onOpenChange,
    onSaved,
    entity: patient,
    empty: EMPTY,
    service: useService("patientService"),
  });

  return (
    <FormDialog {...form.dialogProps}>
      <Grid columns="2" gap="3">
        <TextFormField label="First name" {...form.field("firstName")} />
        <TextFormField label="Last name" {...form.field("lastName")} />
      </Grid>
      <TextFormField
        label="Date of birth"
        type="date"
        {...form.field("dateOfBirth")}
      />
      <TextFormField label="Email" type="email" {...form.field("email")} />
      <TextFormField
        label="Phone number"
        type="tel"
        {...form.field("phoneNumber")}
      />
    </FormDialog>
  );
}
