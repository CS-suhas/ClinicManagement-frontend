"use client";

import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { TextField } from "@radix-ui/themes";

export function SearchField({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <TextField.Root
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      style={{ minWidth: 240 }}
    >
      <TextField.Slot>
        <MagnifyingGlassIcon />
      </TextField.Slot>
    </TextField.Root>
  );
}
