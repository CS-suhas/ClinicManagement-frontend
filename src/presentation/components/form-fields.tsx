import { Select, TextField } from "@radix-ui/themes";
import type { ChangeEvent, ComponentProps } from "react";
import { FormField } from "./form-field";

/** Labelled text input with its validation message. */
export function TextFormField({
  label,
  id,
  error,
  value,
  onChange,
  type,
}: {
  label: string;
  id: string;
  error?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  type?: ComponentProps<typeof TextField.Root>["type"];
}) {
  return (
    <FormField label={label} htmlFor={id} error={error}>
      <TextField.Root id={id} type={type} value={value} onChange={onChange} />
    </FormField>
  );
}

/** Labelled select over `{ value, label }` options. */
export function SelectFormField({
  label,
  id,
  error,
  value,
  onValueChange,
  options,
  placeholder,
}: {
  label: string;
  id: string;
  error?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <FormField label={label} htmlFor={id} error={error}>
      <Select.Root value={value || undefined} onValueChange={onValueChange}>
        <Select.Trigger id={id} placeholder={placeholder} />
        <Select.Content>
          {options.map((o) => (
            <Select.Item key={o.value} value={o.value}>
              {o.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </FormField>
  );
}
