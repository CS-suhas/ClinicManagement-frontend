import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

export type SurfacePadding = "none" | "sm" | "md" | "lg";

const PADDING: Record<SurfacePadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export interface SurfaceProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** Element to render. Defaults to a div. */
  as?: "div" | "article" | "section" | "button";
  /** Inner spacing. Defaults to "md". */
  padding?: SurfacePadding;
  /** Only meaningful with `as="button"`. */
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}

/** White rounded card with the palette's hairline border. */
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
      className={`rounded-2xl bg-white ${PADDING[padding]} ${className ?? ""}`.trim()}
      style={merged}
    >
      {children}
    </Tag>
  );
}
