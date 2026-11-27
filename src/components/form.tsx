"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Dialog,
  Flex,
  Select,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import { type ComponentProps, type ReactNode, useEffect, useId } from "react";
import {
  Controller,
  type DefaultValues,
  type FieldValues,
  FormProvider,
  type Path,
  type UseFormReturn,
  useForm,
  useFormContext,
} from "react-hook-form";
import type { z } from "zod";
import { ApiError } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { ErrorCallout } from "./error-callout";
import { FormField } from "./form-field";
import { SearchField } from "./search-field";

export function FormDialog<
  TSchema extends z.ZodType<FieldValues, FieldValues>,
>({
  open,
  onOpenChange,
  title,
  description = "Fill in the details below.",
  submitLabel = "Save",
  schema,
  defaultValues,
  onSubmit,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  submitLabel?: string;
  schema: TSchema;
  defaultValues: DefaultValues<z.input<TSchema>>;
  onSubmit: (values: z.output<TSchema>) => unknown;
  children:
    | ReactNode
    | ((
        form: UseFormReturn<z.input<TSchema>, unknown, z.output<TSchema>>,
      ) => ReactNode);
}) {
  const form = useForm<z.input<TSchema>, unknown, z.output<TSchema>>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only when the dialog opens.
  useEffect(() => {
    if (open) form.reset(defaultValues);
  }, [open]);

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (e) {
      setFormErrors(form, e);
    }
  });

  const { isSubmitting, errors } = form.formState;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="520px">
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          {description}
        </Dialog.Description>
        <FormProvider {...form}>
          <form onSubmit={submit} noValidate>
            <Flex direction="column" gap="3">
              {errors.root?.message && (
                <ErrorCallout message={errors.root.message} />
              )}
              {typeof children === "function" ? children(form) : children}
            </Flex>
            <Flex gap="3" mt="5" justify="end">
              <Dialog.Close>
                <Button
                  type="button"
                  variant="soft"
                  color="gray"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" loading={isSubmitting}>
                {submitLabel}
              </Button>
            </Flex>
          </form>
        </FormProvider>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export function setFormErrors<T extends FieldValues>(
  form: UseFormReturn<T, unknown, unknown>,
  error: unknown,
) {
  if (error instanceof ApiError && error.fieldErrors) {
    for (const [name, message] of Object.entries(error.fieldErrors))
      form.setError(name as Path<T>, { message });
    return;
  }
  form.setError("root", { message: getErrorMessage(error) });
}

function useFieldError(name: string) {
  const { formState, getFieldState } = useFormContext();
  return getFieldState(name, formState).error?.message;
}

export function TextInput({
  name,
  label,
  slot,
  ...inputProps
}: Omit<ComponentProps<typeof TextField.Root>, "name" | "children"> & {
  name: string;
  label: string;
  slot?: string;
}) {
  const generatedId = useId();
  const id = inputProps.id ?? generatedId;
  const { register } = useFormContext();
  return (
    <FormField label={label} htmlFor={id} error={useFieldError(name)}>
      <TextField.Root {...inputProps} id={id} {...register(name)}>
        {slot && <TextField.Slot>{slot}</TextField.Slot>}
      </TextField.Root>
    </FormField>
  );
}

export function NumberInput({
  name,
  label,
  min,
  step,
}: {
  name: string;
  label: string;
  min?: number;
  step?: number;
}) {
  const id = useId();
  return (
    <FormField label={label} htmlFor={id} error={useFieldError(name)}>
      <Controller
        name={name}
        render={({ field }) => (
          <TextField.Root
            id={id}
            type="number"
            min={min}
            step={step}
            value={field.value ?? ""}
            onBlur={field.onBlur}
            onChange={(e) =>
              field.onChange(
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
          />
        )}
      />
    </FormField>
  );
}

export function TextAreaInput({
  name,
  label,
}: {
  name: string;
  label: string;
}) {
  const id = useId();
  const { register } = useFormContext();
  return (
    <FormField label={label} htmlFor={id} error={useFieldError(name)}>
      <TextArea id={id} {...register(name)} />
    </FormField>
  );
}

export type Option = { value: string; label: string };

const NONE = "__none__";

function OptionSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  noneLabel,
  disabled,
}: {
  id: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  options: Option[];
  placeholder?: string;
  noneLabel?: string;
  disabled?: boolean;
}) {
  return (
    <Select.Root
      value={value ?? (noneLabel ? NONE : undefined)}
      disabled={disabled}
      onValueChange={(v) => onChange(v === NONE ? null : v)}
    >
      <Select.Trigger
        id={id}
        placeholder={placeholder}
        style={{ width: "100%" }}
      />
      <Select.Content>
        {noneLabel && <Select.Item value={NONE}>{noneLabel}</Select.Item>}
        {options.map((o) => (
          <Select.Item key={o.value} value={o.value}>
            {o.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}

export function SelectInput({
  name,
  label,
  options,
  placeholder,
  noneLabel,
  disabled,
}: {
  name: string;
  label: string;
  options: Option[];
  placeholder?: string;
  noneLabel?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <FormField label={label} htmlFor={id} error={useFieldError(name)}>
      <Controller
        name={name}
        render={({ field }) => (
          <OptionSelect
            id={id}
            value={field.value}
            onChange={field.onChange}
            options={options}
            placeholder={placeholder}
            noneLabel={noneLabel}
            disabled={disabled}
          />
        )}
      />
    </FormField>
  );
}

export function SearchSelectInput({
  name,
  label,
  options,
  query,
  onQueryChange,
  searchPlaceholder,
  placeholder,
  disabled,
}: {
  name: string;
  label: string;
  options: Option[];
  query: string;
  onQueryChange: (query: string) => void;
  searchPlaceholder: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <FormField label={label} htmlFor={id} error={useFieldError(name)}>
      <SearchField
        value={query}
        onChange={onQueryChange}
        placeholder={searchPlaceholder}
      />
      <Controller
        name={name}
        render={({ field }) => (
          <OptionSelect
            id={id}
            value={field.value}
            onChange={field.onChange}
            options={options}
            placeholder={placeholder}
            disabled={disabled}
          />
        )}
      />
    </FormField>
  );
}
