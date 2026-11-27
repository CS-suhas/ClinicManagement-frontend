import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

export type SurfacePadding = "none" | "sm" | "md" | "lg";

const PADDING: Record<SurfacePadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export type SurfaceProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  as?: "div" | "article" | "section" | "button";
  padding?: SurfacePadding;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
};

export function Surface({
  as = "div",
  padding = "md",
  disabled,
  className,
  style,
  children,
  ...rest
}: SurfaceProps) {
  const Tag = as;
  const merged: CSSProperties = {
    border: "1px solid var(--mp-paper-deep)",
    ...style,
  };
  return (
    <Tag
      {...rest}
      disabled={disabled}
      className={`rounded-2xl bg-[var(--mp-surface)] ${PADDING[padding]} ${className ?? ""}`.trim()}
      style={merged}
    >
      {children}
    </Tag>
  );
}
