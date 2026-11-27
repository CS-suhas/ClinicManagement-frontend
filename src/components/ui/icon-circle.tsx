import type { ReactNode } from "react";

/** Teal-tint circle holding an icon. */
export function IconCircle({
  children,
  size = 32,
}: {
  children: ReactNode;
  /** Diameter in px. */
  size?: number;
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: "var(--mp-primary-tint)",
        color: "var(--mp-primary)",
      }}
    >
      {children}
    </span>
  );
}
