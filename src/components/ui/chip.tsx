import type { ReactNode } from "react";

export function Chip({
  leading,
  children,
  variant = "chip",
  className,
}: {
  leading?: ReactNode;
  children: ReactNode;
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

export const CHIP_BUTTON_CLASS =
  "inline-flex max-w-full cursor-pointer rounded-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mp-ink)]";
