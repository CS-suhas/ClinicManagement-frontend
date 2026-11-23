import type { ReactNode } from "react";

/**
 * Visual pill for an entity reference: a leading icon or avatar, then the label
 * (truncated at 160 px). Presentational only; wrap it in a GlancePopover trigger
 * to make it interactive, because the focus ring belongs to that button.
 */
export function Chip({
  leading,
  children,
  variant = "chip",
  className,
}: {
  /** An 18 px PersonAvatar or IconCircle. */
  leading?: ReactNode;
  children: ReactNode;
  /** "chip" has the teal tint background; "inline" drops it for dense rows. */
  variant?: "chip" | "inline";
  className?: string;
}) {
  return (
    <span
      className={`inline-flex h-6 max-w-full items-center gap-1.5 rounded-full text-[13px] font-medium ${
        variant === "chip" ? "px-2" : "px-0"
      } ${className ?? ""}`.trim()}
      style={{
        background: variant === "chip" ? "var(--mp-primary-tint)" : undefined,
        color: "var(--mp-ink)",
      }}
    >
      {leading}
      <span className="min-w-0 truncate" style={{ maxWidth: 160 }}>
        {children}
      </span>
    </span>
  );
}

/** Classes for the button that wraps a chip: keyboard focus ring, no default chrome. */
export const CHIP_BUTTON_CLASS =
  "inline-flex max-w-full cursor-pointer rounded-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mp-ink)]";
