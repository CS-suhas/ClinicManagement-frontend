"use client";

import { useNow } from "@/hooks/use-now";
import {
  formatAbsolute,
  formatRelative,
  formatSpan,
} from "@/lib/relative-time";

export function RelativeTime({
  iso,
  now,
  style = "short",
  showAbsolute = false,
  className,
}: {
  iso: string;
  now?: number | null;
  style?: "short" | "long";
  showAbsolute?: boolean;
  className?: string;
}) {
  const clock = useNow();
  const current = now !== undefined ? now : clock;
  const absolute = formatAbsolute(iso);
  const text =
    current === null
      ? absolute
      : style === "long"
        ? formatSpan(iso, current)
        : formatRelative(iso, current);
  return (
    <time dateTime={iso} title={absolute} className={className}>
      {text}
      {showAbsolute && absolute && text !== absolute && (
        <span className="ml-1.5" style={{ color: "var(--mp-muted)" }}>
          ({absolute})
        </span>
      )}
    </time>
  );
}
