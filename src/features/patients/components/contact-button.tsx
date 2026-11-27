"use client";

import { IconButton } from "@radix-ui/themes";
import type { ReactNode } from "react";

export function ContactButton({
  href,
  label,
  icon,
  solid = false,
}: {
  href: string | null;
  label: string;
  icon: ReactNode;
  solid?: boolean;
}) {
  const variant = solid ? "solid" : "soft";
  if (!href)
    return (
      <IconButton
        variant={variant}
        color="teal"
        disabled
        aria-label={`${label} (not on file)`}
      >
        {icon}
      </IconButton>
    );
  return (
    <IconButton variant={variant} color="teal" aria-label={label} asChild>
      <a href={href}>{icon}</a>
    </IconButton>
  );
}
