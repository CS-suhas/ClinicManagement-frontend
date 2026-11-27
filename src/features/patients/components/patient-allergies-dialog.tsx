"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "@radix-ui/react-icons";
import { Button, Dialog, Flex, Grid, Text } from "@radix-ui/themes";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { AsyncContent } from "@/components/async-content";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { type Column, DataTable } from "@/components/data-table";
import { ErrorCallout } from "@/components/error-callout";
import { SelectInput, TextAreaInput } from "@/components/form";
import { getErrorMessage } from "@/lib/errors";
import {
  useAddPatientAllergy,
  useAllergySeverities,
  usePatientAllergyList,
  usePatientAllergyOptions,
  useRemovePatientAllergy,
  useUpdatePatientAllergy,
} from "../api";
import {
  type Patient,
  type PatientAllergy,
  type PatientAllergyForm,
  patientAllergyForm,
} from "../schemas";
import { patientFullName } from "../utils";
import { SeverityBadge, severityLabel } from "./severity-badge";

const EMPTY_FORM: PatientAllergyForm = {
  allergyId: "",
  severity: "",
  notes: "",
};

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
  readOnly?: boolean;
};

export function PatientAllergiesDialog(props: DialogProps) {
  const [openCount, setOpenCount] = useState(props.open ? 1 : 0);
  const [wasOpen, setWasOpen] = useState(props.open);
  if (props.open !== wasOpen) {
    setWasOpen(props.open);
    if (props.open) setOpenCount((count) => count + 1);
  }
  if (openCount === 0) return null;
  return (
    <AllergiesDialogContent
      key={`${props.patient?.id ?? ""}:${openCount}`}
      {...props}
    />
  );
}

function AllergiesDialogContent({
  open,
  onOpenChange,
  patient,
  readOnly = false,
}: DialogProps) {
  const patientId = patient?.id ?? "";
  const active = open && patientId !== "";
  const records = usePatientAllergyList(patientId, active);
  const severities = useAllergySeverities();
  const add = useAddPatientAllergy();
  const update = useUpdatePatientAllergy();
  const remove = useRemovePatientAllergy();

  const [editing, setEditing] = useState<PatientAllergy | null>(null);
  const [removing, setRemoving] = useState<PatientAllergy | null>(null);
  const options = usePatientAllergyOptions(
    patientId,
    editing?.allergyId,
    active && !readOnly,
  );
  const form = useForm<PatientAllergyForm>({
    resolver: zodResolver(patientAllergyForm),
    defaultValues: EMPTY_FORM,
  });

  const allergies = (records.data ?? []).map((allergy) => ({
    ...allergy,
    id: allergy.allergyId,
  }));
  const selectable = options.data?.items ?? [];
  const typeName = (allergyId: string) =>
    allergies.find((item) => item.allergyId === allergyId)?.name ??
    selectable.find((item) => item.id === allergyId)?.name ??
    allergyId;
  const allAllergiesRecorded =
    !editing && !records.isPending && options.data?.totalCount === 0;

  const cancelEdit = () => {
    setEditing(null);
    form.reset(EMPTY_FORM);
  };

  const startEdit = (allergy: PatientAllergy) => {
    if (readOnly) return;
    setEditing(allergy);
    form.reset({
      allergyId: allergy.allergyId,
      severity:
        severities.data?.find(
          (severity) =>
            severity.toLowerCase() === allergy.severity.toLowerCase(),
        ) ?? "",
      notes: allergy.notes ?? "",
    });
  };

  const submit = form.handleSubmit(async (values) => {
    if (!patient || readOnly) return;
    const write = editing ? update : add;
    const saved = await write
      .mutateAsync({
        patientId: patient.id,
        allergyId: values.allergyId,
        severity: values.severity,
        notes: values.notes.trim(),
      })
      .then(
        () => true,
        () => false,
      );
    if (saved) cancelEdit();
  });

  const confirmRemove = () => {
    if (!removing || !patient || readOnly) return;
    if (editing?.allergyId === removing.allergyId) cancelEdit();
    remove.mutate({ patientId: patient.id, allergyId: removing.allergyId });
  };

  const columns: Column<(typeof allergies)[number]>[] = [
    { header: "Allergy", cell: (pa) => typeName(pa.allergyId) },
    {
      header: "Severity",
      cell: (pa) => <SeverityBadge severity={pa.severity} />,
    },
    { header: "Notes", cell: (pa) => pa.notes },
  ];

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Content maxWidth="640px">
          <Dialog.Title>
            Allergies — {patient ? patientFullName(patient) : ""}
          </Dialog.Title>
          <Dialog.Description size="2" color="gray" mb="4">
            {readOnly
              ? "Recorded allergies, their severity and notes. Read only."
              : "Record known allergies, their severity and notes."}
          </Dialog.Description>

          <Flex direction="column" gap="4">
            <AsyncContent
              loading={records.isPending}
              error={records.error ? getErrorMessage(records.error) : null}
              isEmpty={allergies.length === 0}
              emptyText="No allergies recorded."
              onRetry={() => void records.refetch()}
            >
              <DataTable
                columns={columns}
                rows={allergies}
                rowLabel={(pa) => typeName(pa.allergyId)}
                onEdit={readOnly ? undefined : startEdit}
                onDelete={readOnly ? undefined : setRemoving}
              />
            </AsyncContent>

            {!readOnly && (
              <FormProvider {...form}>
                <form onSubmit={submit} noValidate>
                  <Flex direction="column" gap="3">
                    <Text size="2" weight="bold">
                      {editing ? "Edit allergy" : "Add allergy"}
                    </Text>
                    {options.error && (
                      <ErrorCallout
                        message={getErrorMessage(options.error)}
                        onRetry={() => void options.refetch()}
                      />
                    )}
                    <Grid columns="2" gap="3">
                      <SelectInput
                        name="allergyId"
                        label="Allergy"
                        placeholder="Choose an allergy…"
                        disabled={editing !== null}
                        options={selectable.map((type) => ({
                          value: type.id,
                          label: type.name,
                        }))}
                      />
                      <SelectInput
                        name="severity"
                        label="Severity"
                        options={(severities.data ?? []).map((severity) => ({
                          value: severity,
                          label: severityLabel(severity),
                        }))}
                      />
                    </Grid>
                    {allAllergiesRecorded && (
                      <Text size="1" color="gray">
                        Every allergy type is already recorded for this patient.
                      </Text>
                    )}
                    <TextAreaInput name="notes" label="Notes" />
                    <Flex gap="2" justify="end">
                      {editing && (
                        <Button
                          type="button"
                          variant="soft"
                          color="gray"
                          disabled={form.formState.isSubmitting}
                          onClick={cancelEdit}
                        >
                          Cancel edit
                        </Button>
                      )}
                      <Button
                        type="submit"
                        loading={form.formState.isSubmitting}
                        disabled={!patient}
                      >
                        {editing ? (
                          "Save changes"
                        ) : (
                          <>
                            <PlusIcon /> Add allergy
                          </>
                        )}
                      </Button>
                    </Flex>
                  </Flex>
                </form>
              </FormProvider>
            )}

            <Flex justify="end">
              <Dialog.Close>
                <Button variant="soft" color="gray">
                  Close
                </Button>
              </Dialog.Close>
            </Flex>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      <ConfirmDeleteDialog
        open={removing !== null}
        onOpenChange={(isOpen) => !isOpen && setRemoving(null)}
        onConfirm={confirmRemove}
        title="Remove allergy?"
        description={`"${removing ? typeName(removing.allergyId) : ""}" will be removed from this patient's record.`}
      />
    </>
  );
}
