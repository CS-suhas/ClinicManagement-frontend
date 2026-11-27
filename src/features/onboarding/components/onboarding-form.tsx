"use client";

import { TextField } from "@radix-ui/themes";
import type { ComponentProps } from "react";
import {
  type FieldValues,
  type Path,
  type UseFormReturn,
  useFormContext,
} from "react-hook-form";
import { FormField } from "@/components/form-field";
import { ApiError } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

type OnboardingInputProps = Omit<
  ComponentProps<typeof TextField.Root>,
  "name" | "id" | "children"
> & {
  name: string;
  label: string;
  id: string;
  slot?: string;
};

export function OnboardingInput({
  name,
  label,
  id,
  slot,
  ...inputProps
}: OnboardingInputProps) {
  const { register, formState, getFieldState } = useFormContext();
  const error = getFieldState(name, formState).error?.message;
  return (
    <FormField label={label} htmlFor={id} error={error}>
      <TextField.Root id={id} {...inputProps} {...register(name)}>
        {slot && <TextField.Slot>{slot}</TextField.Slot>}
      </TextField.Root>
    </FormField>
  );
}

export function setSubmitError<T extends FieldValues>(
  form: UseFormReturn<T>,
  error: unknown,
) {
  if (error instanceof ApiError && error.fieldErrors) {
    for (const [name, message] of Object.entries(error.fieldErrors))
      form.setError(name as Path<T>, { message });
    return;
  }
  form.setError("root", { message: getErrorMessage(error) });
}
