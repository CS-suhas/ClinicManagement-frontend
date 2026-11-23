"use client";

import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { TextField } from "@radix-ui/themes";

export function SearchField({
  value,
  onChange,
  placeholder = "Search…",
  size = "2",
  fullWidth = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  size?: "1" | "2" | "3";
  fullWidth?: boolean;
}) {
  return (
    <TextField.Root
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      size={size}
      style={fullWidth ? undefined : { minWidth: 240 }}
    >
      <TextField.Slot>
        <MagnifyingGlassIcon />
      </TextField.Slot>
    </TextField.Root>
  );
}
