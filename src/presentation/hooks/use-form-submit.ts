"use client";

import { useCallback, useState } from "react";
import { type FieldErrors, ValidationError } from "@/domain/errors";
import { getErrorMessage } from "../lib/errors";

/**
 * Runs a mutation and maps domain errors to UI state:
 * ValidationError -> fieldErrors, anything else -> formError.
 * `run` resolves to true on success so callers can close dialogs / reload.
 */
export function useFormSubmit() {
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setFieldErrors({});
    setFormError(null);
  }, []);

  const run = useCallback(
    async (fn: () => Promise<unknown>): Promise<boolean> => {
      setSubmitting(true);
      setFieldErrors({});
      setFormError(null);
      try {
        await fn();
        return true;
      } catch (e) {
        if (e instanceof ValidationError) setFieldErrors(e.fieldErrors);
        else setFormError(getErrorMessage(e));
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  return { submitting, fieldErrors, formError, run, reset };
}
