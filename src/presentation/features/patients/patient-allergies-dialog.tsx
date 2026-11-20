"use client";

import { PlusIcon } from "@radix-ui/react-icons";
import {
  Button,
  Dialog,
  Flex,
  Grid,
  Select,
  Table,
  Text,
  TextArea,
} from "@radix-ui/themes";
import { type FormEvent, useEffect, useState } from "react";
import { useService } from "@/di/container-provider";
import {
  type AllergyType,
  type Patient,
  type PatientAllergy,
  patientFullName,
  type Severity,
} from "@/domain/entities";
import { AsyncContent } from "@/presentation/components/async-content";
import { ConfirmDeleteDialog } from "@/presentation/components/confirm-delete-dialog";
import { ErrorCallout } from "@/presentation/components/error-callout";
import { FormField } from "@/presentation/components/form-field";
import { RowActions } from "@/presentation/components/row-actions";
import { useAsyncData } from "@/presentation/hooks/use-async-data";
import { useFormSubmit } from "@/presentation/hooks/use-form-submit";
import { SeverityBadge, severityLabel } from "./severity-badge";

interface Loaded {
  allergies: PatientAllergy[];
  types: AllergyType[];
  severities: string[];
}

interface AllergyForm {
  allergyId: string;
  severity: Severity;
  notes: string;
}

const EMPTY_FORM: AllergyForm = { allergyId: "", severity: "", notes: "" };

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
  const patientAllergyService = useService("patientAllergyService");
  const allergyTypeService = useService("allergyTypeService");
  const configurationService = useService("configurationService");
  const { submitting, fieldErrors, formError, run, reset } = useFormSubmit();

  const { data, loading, error, reload } = useAsyncData<Loaded>(async () => {
    if (!patient) return { allergies: [], types: [], severities: [] };
    const [allergies, types, severities] = await Promise.all([
      patientAllergyService.listByPatient(patient.id),
      allergyTypeService.list(),
      configurationService.getAllergySeverities(),
    ]);
    return { allergies, types, severities };
  });

  const [editing, setEditing] = useState<PatientAllergy | null>(null);
  const [form, setForm] = useState<AllergyForm>(EMPTY_FORM);
  const [removing, setRemoving] = useState<PatientAllergy | null>(null);

  const patientId = patient?.id;
  useEffect(() => {
    setEditing(null);
    setForm(EMPTY_FORM);
    reset();
    if (open && patientId) void reload();
  }, [open, patientId, reload, reset]);

  const allergies = data?.allergies ?? [];
  const types = data?.types ?? [];
  const severities = data?.severities ?? [];
  const typeName = (allergyId: string) =>
    types.find((t) => t.id === allergyId)?.name ?? allergyId;

  // Adding: only types not yet recorded. Editing: just the fixed allergy.
  const recordedIds = new Set(allergies.map((a) => a.allergyId));
  const selectable = editing
    ? types.filter((t) => t.id === editing.allergyId)
    : types.filter((t) => !recordedIds.has(t.id));

  const startEdit = (pa: PatientAllergy) => {
    setEditing(pa);
    setForm({
      allergyId: pa.allergyId,
      severity:
        severities.find(
          (severity) => severity.toLowerCase() === pa.severity.toLowerCase(),
        ) ?? "",
      notes: pa.notes,
    });
    reset();
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    reset();
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!patient) return;
    const record: PatientAllergy = {
      patientId: patient.id,
      allergyId: form.allergyId,
      severity: form.severity,
      notes: form.notes.trim(),
    };
    const ok = await run(() =>
      editing
        ? patientAllergyService.update(record)
        : patientAllergyService.add(record),
    );
    if (ok) {
      cancelEdit();
      void reload();
    }
  };

  const removeConfirmed = () =>
    removing && patient
      ? patientAllergyService.remove(patient.id, removing.allergyId)
      : Promise.resolve();

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
              loading={loading}
              error={error}
              isEmpty={allergies.length === 0}
              emptyText="No allergies recorded."
              onRetry={reload}
            >
              <Table.Root variant="surface">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Allergy</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Severity</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Notes</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell justify="end">
                      Actions
                    </Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {allergies.map((pa) => {
                    const name = typeName(pa.allergyId);
                    return (
                      <Table.Row key={pa.allergyId} align="center">
                        <Table.RowHeaderCell>{name}</Table.RowHeaderCell>
                        <Table.Cell>
                          <SeverityBadge severity={pa.severity} />
                        </Table.Cell>
                        <Table.Cell>{pa.notes}</Table.Cell>
                        <Table.Cell justify="end">
                          <RowActions
                            label={name}
                            onEdit={() => startEdit(pa)}
                            onDelete={() => setRemoving(pa)}
                          />
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table.Root>
            </AsyncContent>

            <form onSubmit={submit} noValidate>
              <Flex direction="column" gap="3">
                <Text size="2" weight="bold">
                  {editing ? "Edit allergy" : "Add allergy"}
                </Text>
                {formError && <ErrorCallout message={formError} />}
                <Grid columns="2" gap="3">
                  <FormField
                    label="Allergy"
                    htmlFor="allergy-select"
                    error={fieldErrors.allergyId}
                  >
                    <Select.Root
                      value={form.allergyId}
                      disabled={editing !== null}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, allergyId: v }))
                      }
                    >
                      <Select.Trigger
                        id="allergy-select"
                        placeholder="Choose an allergy…"
                      />
                      <Select.Content>
                        {selectable.map((t) => (
                          <Select.Item key={t.id} value={t.id}>
                            {t.name}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </FormField>
                  <FormField
                    label="Severity"
                    htmlFor="allergy-severity"
                    error={fieldErrors.severity}
                  >
                    <Select.Root
                      value={form.severity}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, severity: v }))
                      }
                    >
                      <Select.Trigger id="allergy-severity" />
                      <Select.Content>
                        {severities.map((s) => (
                          <Select.Item key={s} value={s}>
                            {severityLabel(s)}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </FormField>
                </Grid>
                {!editing && !loading && selectable.length === 0 && (
                  <Text size="1" color="gray">
                    Every allergy type is already recorded for this patient.
                  </Text>
                )}
                <FormField label="Notes" htmlFor="allergy-notes">
                  <TextArea
                    id="allergy-notes"
                    value={form.notes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, notes: e.target.value }))
                    }
                  />
                </FormField>
                <Flex gap="2" justify="end">
                  {editing && (
                    <Button
                      type="button"
                      variant="soft"
                      color="gray"
                      disabled={submitting}
                      onClick={cancelEdit}
                    >
                      Cancel edit
                    </Button>
                  )}
                  <Button
                    type="submit"
                    loading={submitting}
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
        open={removing !== null}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Remove allergy?"
        description={`"${removing ? typeName(removing.allergyId) : ""}" will be removed from this patient's record.`}
        onConfirm={removeConfirmed}
        onDeleted={() => {
          if (editing && removing && editing.allergyId === removing.allergyId)
            cancelEdit();
          setRemoving(null);
          void reload();
        }}
      />
    </>
  );
}
