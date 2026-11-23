"use client";

import { type ChangeEvent, useEffect, useState } from "react";
import { useFormSubmit } from "./use-form-submit";

type StringKey<T> = {
  [K in keyof T]: T[K] extends string | null ? K : never;
}[keyof T] &
  string;

interface UseEntityFormOptions<
  TEntity extends TValues & { id: string },
  TValues,
> {
  /** Singular noun used in titles and the submit label, e.g. "clinic". */
  entityName: string;
  /** Prefix for generated element ids, e.g. "clinic" -> "clinic-name". */
  idPrefix: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Saves the values (create when `entity` is null). Should throw
   * ValidationError for invalid input and otherwise return immediately: the
   * dialog closes as soon as it returns.
   */
  onSave: (values: TValues, entity: TEntity | null) => void;
  /** Create when null, edit otherwise. */
  entity: TEntity | null;
  /** Initial values for create; its keys decide which fields an edit copies. */
  empty: TValues;
}

/**
 * Form state for a create/edit dialog: resets when the dialog opens, tracks
 * values, hands them to `onSave`, and maps validation errors to fields.
 */
export function useEntityForm<
  TEntity extends TValues & { id: string },
  TValues extends object,
>({
  entityName,
  idPrefix,
  open,
  onOpenChange,
  onSave,
  entity,
  empty,
}: UseEntityFormOptions<TEntity, TValues>) {
  const { submitting, fieldErrors, formError, run, reset } = useFormSubmit();
  const [values, setValues] = useState<TValues>(empty);

  useEffect(() => {
    if (!open) return;
    reset();
    if (!entity) return setValues(empty);
    const keys = Object.keys(empty) as (keyof TValues)[];
    setValues(Object.fromEntries(keys.map((k) => [k, entity[k]])) as TValues);
  }, [open, entity, empty, reset]);

  const submit = async () => {
    const saved = await run(async () => onSave(values, entity));
    if (saved) onOpenChange(false);
  };

  const base = (name: StringKey<TValues>) => ({
    id: `${idPrefix}-${name}`,
    value: (values[name] as string | null) ?? "",
    error: fieldErrors[name],
  });

  return {
    values,
    /** Props for a text input; `emptyAsNull` stores "" as null. */
    field: (name: StringKey<TValues>, { emptyAsNull = false } = {}) => ({
      ...base(name),
      onChange: (e: ChangeEvent<HTMLInputElement>) =>
        setValues((v) => ({
          ...v,
          [name]: emptyAsNull ? e.target.value || null : e.target.value,
        })),
    }),
    /** Props for a select. */
    selectField: (name: StringKey<TValues>) => ({
      ...base(name),
      onValueChange: (value: string) =>
        setValues((v) => ({ ...v, [name]: value })),
    }),
    /** Spread onto FormDialog. */
    dialogProps: {
      open,
      onOpenChange,
      title: `${entity ? "Edit" : "New"} ${entityName}`,
      submitLabel: entity ? "Save changes" : `Create ${entityName}`,
      submitting,
      formError,
      onSubmit: submit,
    },
  };
}
