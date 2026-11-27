"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useService } from "@/di/container-provider";
import type {
  AllergyType,
  Patient,
  PatientAllergy,
  Severity,
} from "@/domain/entities";
import type { PagedResult } from "@/domain/repositories";
import { useAsyncData } from "@/hooks/use-async-data";
import { useFormSubmit } from "@/hooks/use-form-submit";
import { useOptimisticMutations } from "@/hooks/use-optimistic-mutations";

type AllergyForm = {
  allergyId: string;
  severity: Severity;
  notes: string;
};

type Loaded = {
  allergies: PatientAllergy[];
  severities: string[];
};

const EMPTY_FORM: AllergyForm = { allergyId: "", severity: "", notes: "" };
const OPTIONS_PAGE = { page: 1, pageSize: 100 };

export function usePatientAllergies({
  open,
  patient,
  readOnly = false,
}: {
  open: boolean;
  patient: Patient | null;
  readOnly?: boolean;
}) {
  const patientAllergyService = useService("patientAllergyService");
  const configurationService = useService("configurationService");
  const { submitting, fieldErrors, formError, run, reset } = useFormSubmit();

  const patientId = patient?.id;
  const { data, loading, error, reload, refresh, mutate } =
    useAsyncData<Loaded>(async () => {
      if (!patientId) return { allergies: [], severities: [] };
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
    refresh: refreshOptions,
    mutate: mutateOptions,
  } = useAsyncData(
    () =>
      open && patientId && !readOnly
        ? patientAllergyService.allergyOptions(patientId, {
            ...OPTIONS_PAGE,
            selectedAllergyId: editing?.allergyId,
          })
        : Promise.resolve(undefined),
    `${open}|${patientId}|${editing?.allergyId ?? ""}`,
  );

  const runOptimistic = useOptimisticMutations(() => {
    void refresh();
    void refreshOptions();
  });

  const allergies = data?.allergies ?? [];
  const severities = data?.severities ?? [];
  const selectable = options?.items ?? [];
  const typeName = (allergyId: string) =>
    allergies.find((item) => item.allergyId === allergyId)?.allergyName ??
    selectable.find((item) => item.id === allergyId)?.name ??
    allergyId;

  const editAllergies = (
    change: (items: PatientAllergy[]) => PatientAllergy[],
  ) =>
    mutate(
      (current) =>
        current && { ...current, allergies: change(current.allergies) },
    );

  const editOptions = (
    change: (items: AllergyType[]) => AllergyType[],
    countChange: number,
  ) =>
    mutateOptions(
      (current): PagedResult<AllergyType> | undefined =>
        current && {
          ...current,
          items: change(current.items),
          totalCount: Math.max(0, current.totalCount + countChange),
        },
    );

  const cancelEdit = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    reset();
  };

  const startEdit = (pa: PatientAllergy) => {
    if (readOnly) return;
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

  const sameAllergy = (a: { allergyId: string }, id: string) =>
    a.allergyId === id;

  const saveRecord = (record: PatientAllergy) => {
    if (editing) {
      const previous = editing;
      const updated = { ...previous, ...record };
      runOptimistic({
        apply: () =>
          editAllergies((items) =>
            items.map((i) => (sameAllergy(i, record.allergyId) ? updated : i)),
          ),
        rollback: () =>
          editAllergies((items) =>
            items.map((i) => (sameAllergy(i, record.allergyId) ? previous : i)),
          ),
        request: () => patientAllergyService.update(record),
        failureMessage: "Could not update allergy",
      });
      return;
    }
    const type = selectable.find((t) => t.id === record.allergyId);
    const added = { ...record, allergyName: type?.name };
    runOptimistic({
      apply: () => {
        editAllergies((items) => [...items, added]);
        editOptions(
          (items) => items.filter((t) => t.id !== record.allergyId),
          -1,
        );
      },
      rollback: () => {
        editAllergies((items) =>
          items.filter((i) => !sameAllergy(i, record.allergyId)),
        );
        if (type) editOptions((items) => [...items, type], 1);
      },
      request: () => patientAllergyService.add(record),
      failureMessage: "Could not add allergy",
    });
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!patient || readOnly) return;
    const record: PatientAllergy = {
      patientId: patient.id,
      allergyId: form.allergyId,
      severity: form.severity,
      notes: form.notes.trim(),
    };
    const saved = await run(async () => {
      patientAllergyService.validateInput(record);
      saveRecord(record);
    });
    if (saved) cancelEdit();
  };

  const remove = (pa: PatientAllergy) => {
    if (!patient || readOnly) return;
    if (editing && sameAllergy(editing, pa.allergyId)) cancelEdit();
    const type: AllergyType = {
      id: pa.allergyId,
      name: typeName(pa.allergyId),
    };
    let index = -1;
    runOptimistic({
      apply: () => {
        editAllergies((items) => {
          index = items.findIndex((i) => sameAllergy(i, pa.allergyId));
          return items.filter((i) => !sameAllergy(i, pa.allergyId));
        });
        editOptions((items) => [...items, type], 1);
      },
      rollback: () => {
        editAllergies((items) => {
          const at = index < 0 ? items.length : index;
          return [...items.slice(0, at), pa, ...items.slice(at)];
        });
        editOptions((items) => items.filter((t) => t.id !== pa.allergyId), -1);
      },
      request: () => patientAllergyService.remove(patient.id, pa.allergyId),
      failureMessage: "Could not remove allergy",
    });
  };

  return {
    readOnly,
    allergies: allergies.map((a) => ({ ...a, id: a.allergyId })),
    severities,
    loading,
    error,
    reload,
    typeName,
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
    removing,
    setRemoving,
    removeDialog: {
      open: removing !== null,
      onOpenChange: (isOpen: boolean) => !isOpen && setRemoving(null),
      onConfirm: () => removing && remove(removing),
    },
  };
}
