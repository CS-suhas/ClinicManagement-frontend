"use client";

import { PlusIcon } from "@radix-ui/react-icons";
import { Button, Dialog, Flex, Grid, Text } from "@radix-ui/themes";
import { type Patient, patientFullName } from "@/domain/entities";
import { AsyncContent } from "@/presentation/components/async-content";
import { ConfirmDeleteDialog } from "@/presentation/components/confirm-delete-dialog";
import { type Column, DataTable } from "@/presentation/components/data-table";
import { ErrorCallout } from "@/presentation/components/error-callout";
import {
  SelectFormField,
  TextAreaFormField,
} from "@/presentation/components/form-fields";
import { SeverityBadge, severityLabel } from "./severity-badge";
import { usePatientAllergies } from "./use-patient-allergies";

/** Lists and edits the allergies recorded for one patient. */
export function PatientAllergiesDialog({
  open,
  onOpenChange,
  patient,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
}) {
  const state = usePatientAllergies({ open, patient });
  const { form, editing, fieldErrors } = state;

  const columns: Column<(typeof state.allergies)[number]>[] = [
    { header: "Allergy", cell: (pa) => state.typeName(pa.allergyId) },
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
            Record known allergies, their severity and notes.
          </Dialog.Description>

          <Flex direction="column" gap="4">
            <AsyncContent
              loading={state.loading}
              error={state.error}
              isEmpty={state.allergies.length === 0}
              emptyText="No allergies recorded."
              onRetry={state.reload}
            >
              <DataTable
                columns={columns}
                rows={state.allergies}
                rowLabel={(pa) => state.typeName(pa.allergyId)}
                onEdit={state.startEdit}
                onDelete={state.setRemoving}
              />
            </AsyncContent>

            <form onSubmit={state.submit} noValidate>
              <Flex direction="column" gap="3">
                <Text size="2" weight="bold">
                  {editing ? "Edit allergy" : "Add allergy"}
                </Text>
                {state.formError && <ErrorCallout message={state.formError} />}
                {state.optionsError && (
                  <ErrorCallout
                    message={state.optionsError}
                    onRetry={() => void state.reloadOptions()}
                  />
                )}
                <Grid columns="2" gap="3">
                  <SelectFormField
                    label="Allergy"
                    id="allergy-select"
                    placeholder="Choose an allergy…"
                    error={fieldErrors.allergyId}
                    disabled={editing !== null}
                    value={form.allergyId}
                    onValueChange={(v) => state.setField("allergyId", v)}
                    options={state.selectable.map((t) => ({
                      value: t.id,
                      label: t.name,
                    }))}
                  />
                  <SelectFormField
                    label="Severity"
                    id="allergy-severity"
                    error={fieldErrors.severity}
                    value={form.severity}
                    onValueChange={(v) => state.setField("severity", v)}
                    options={state.severities.map((s) => ({
                      value: s,
                      label: severityLabel(s),
                    }))}
                  />
                </Grid>
                {state.allAllergiesRecorded && (
                  <Text size="1" color="gray">
                    Every allergy type is already recorded for this patient.
                  </Text>
                )}
                <TextAreaFormField
                  label="Notes"
                  id="allergy-notes"
                  value={form.notes}
                  onChange={(e) => state.setField("notes", e.target.value)}
                />
                <Flex gap="2" justify="end">
                  {editing && (
                    <Button
                      type="button"
                      variant="soft"
                      color="gray"
                      disabled={state.submitting}
                      onClick={state.cancelEdit}
                    >
                      Cancel edit
                    </Button>
                  )}
                  <Button
                    type="submit"
                    loading={state.submitting}
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
        {...state.removeDialog}
        title="Remove allergy?"
        description={`"${state.removing ? state.typeName(state.removing.allergyId) : ""}" will be removed from this patient's record.`}
      />
    </>
  );
}
