"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useService } from "@/di/container-provider";
import type { Patient, PatientAllergy, Severity } from "@/domain/entities";
import { useAsyncData } from "@/presentation/hooks/use-async-data";
import { useFormSubmit } from "@/presentation/hooks/use-form-submit";

interface AllergyForm {
  allergyId: string;
  severity: Severity;
  notes: string;
}

const EMPTY_FORM: AllergyForm = { allergyId: "", severity: "", notes: "" };
const OPTIONS_PAGE = { page: 1, pageSize: 100 };

/** Loading, editing and removing of one patient's recorded allergies. */
export function usePatientAllergies({
  open,
  patient,
}: {
  open: boolean;
  patient: Patient | null;
}) {
  const patientAllergyService = useService("patientAllergyService");
  const configurationService = useService("configurationService");
  const { submitting, fieldErrors, formError, run, reset } = useFormSubmit();

  const patientId = patient?.id;
  const { data, loading, error, reload } = useAsyncData(async () => {
    if (!patientId) return { allergies: [], severities: [] as string[] };
    const [allergyPage, severities] = await Promise.all([
      patientAllergyService.searchByPatient(patientId, OPTIONS_PAGE),
      configurationService.getAllergySeverities(),
    ]);
    return { allergies: allergyPage.items, severities };
  }, `${open}|${patientId}`);

  const [editing, setEditing] = useState<PatientAllergy | null>(null);
  const [form, setForm] = useState<AllergyForm>(EMPTY_FORM);
  const [removing, setRemoving] = useState<PatientAllergy | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: start from a clean form whenever the dialog opens, closes or switches patient.
  useEffect(() => {
    setEditing(null);
    setForm(EMPTY_FORM);
    reset();
  }, [open, patientId, reset]);

  const {
    data: options,
    error: optionsError,
    reload: reloadOptions,
  } = useAsyncData(
    () =>
      open && patientId
        ? patientAllergyService.allergyOptions(patientId, {
            ...OPTIONS_PAGE,
            selectedAllergyId: editing?.allergyId,
          })
        : Promise.resolve(undefined),
    `${open}|${patientId}|${editing?.allergyId ?? ""}`,
  );

  const allergies = data?.allergies ?? [];
  const severities = data?.severities ?? [];
  const selectable = options?.items ?? [];
  const typeName = (allergyId: string) =>
    allergies.find((item) => item.allergyId === allergyId)?.allergyName ??
    selectable.find((item) => item.id === allergyId)?.name ??
    allergyId;

  const cancelEdit = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    reset();
  };

  const startEdit = (pa: PatientAllergy) => {
    setEditing(pa);
    setForm({
      allergyId: pa.allergyId,
      severity:
        severities.find((s) => s.toLowerCase() === pa.severity.toLowerCase()) ??
        "",
      notes: pa.notes,
    });
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
      const wasEditing = editing !== null;
      cancelEdit();
      void reload();
      if (!wasEditing) void reloadOptions();
    }
  };

  return {
    // recorded allergies (given an `id` so they fit DataTable)
    allergies: allergies.map((a) => ({ ...a, id: a.allergyId })),
    severities,
    loading,
    error,
    reload,
    typeName,
    // add / edit form
    editing,
    form,
    setField: <K extends keyof AllergyForm>(field: K, value: AllergyForm[K]) =>
      setForm((current) => ({ ...current, [field]: value })),
    selectable,
    optionsError,
    reloadOptions,
    allAllergiesRecorded: !editing && !loading && options?.totalCount === 0,
    submitting,
    fieldErrors,
    formError,
    submit,
    startEdit,
    cancelEdit,
    // removal; spread `removeDialog` onto ConfirmDeleteDialog
    removing,
    setRemoving,
    removeDialog: {
      open: removing !== null,
      onOpenChange: (isOpen: boolean) => !isOpen && setRemoving(null),
      onConfirm: () =>
        removing && patient
          ? patientAllergyService.remove(patient.id, removing.allergyId)
          : Promise.resolve(),
      onDeleted: () => {
        const wasEditing =
          editing !== null &&
          removing !== null &&
          editing.allergyId === removing.allergyId;
        if (wasEditing) cancelEdit();
        setRemoving(null);
        void reload();
        if (!wasEditing) void reloadOptions();
      },
    },
  };
}
