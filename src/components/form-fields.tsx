import { Select, TextArea, TextField } from "@radix-ui/themes";
import type { ChangeEvent, ComponentProps } from "react";
import { FormField } from "./form-field";
import { SearchField } from "./search-field";

/** Labelled text input with its validation message. */
export function TextFormField({
  label,
  id,
  error,
  value,
  onChange,
  type,
  min,
  step,
}: {
  label: string;
  id: string;
  error?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  type?: ComponentProps<typeof TextField.Root>["type"];
  min?: number;
  step?: number;
}) {
  return (
    <FormField label={label} htmlFor={id} error={error}>
      <TextField.Root
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        min={min}
        step={step}
      />
    </FormField>
  );
}

/** Labelled multi-line input with its validation message. */
export function TextAreaFormField({
  label,
  id,
  error,
  value,
  onChange,
}: {
  label: string;
  id: string;
  error?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <FormField label={label} htmlFor={id} error={error}>
      <TextArea id={id} value={value} onChange={onChange} />
    </FormField>
  );
}

type Option = {
  value: string;
  label: string;
};

function OptionSelect({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  fullWidth,
}: {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <Select.Root
      value={value || undefined}
      disabled={disabled}
      onValueChange={onValueChange}
    >
      <Select.Trigger
        id={id}
        placeholder={placeholder}
        style={fullWidth ? { width: "100%" } : undefined}
      />
      <Select.Content>
        {options.map((o) => (
          <Select.Item key={o.value} value={o.value}>
            {o.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}

/** Labelled select over `{ value, label }` options. */
export function SelectFormField({
  label,
  id,
  error,
  ...select
}: {
  label: string;
  id: string;
  error?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <FormField label={label} htmlFor={id} error={error}>
      <OptionSelect id={id} {...select} />
    </FormField>
  );
}

/** A select preceded by a search box that narrows its options. */
export function SearchSelectField({
  label,
  id,
  error,
  query,
  onQueryChange,
  searchPlaceholder,
  ...select
}: {
  label: string;
  id: string;
  error?: string;
  query: string;
  onQueryChange: (query: string) => void;
  searchPlaceholder: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <FormField label={label} htmlFor={id} error={error}>
      <SearchField
        value={query}
        onChange={onQueryChange}
        placeholder={searchPlaceholder}
      />
      <OptionSelect id={id} fullWidth {...select} />
    </FormField>
  );
}
