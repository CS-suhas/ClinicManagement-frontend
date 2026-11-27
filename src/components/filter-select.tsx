import { Select } from "@radix-ui/themes";

/** Value meaning "no filter applied". */
export const ALL_FILTER = "all";

/** Toolbar dropdown that filters a list; the first item clears the filter. */
export function FilterSelect({
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  /** Accessible name of the dropdown. */
  label: string;
  /** Text of the item that clears the filter, e.g. "All clinics". */
  allLabel: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger aria-label={label} />
      <Select.Content>
        <Select.Item value={ALL_FILTER}>{allLabel}</Select.Item>
        {options.map((o) => (
          <Select.Item key={o.value} value={o.value}>
            {o.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}
