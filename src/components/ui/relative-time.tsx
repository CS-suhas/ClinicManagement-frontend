"use client";

import { useNow } from "@/hooks/use-now";
import {
  formatAbsolute,
  formatRelative,
  formatSpan,
} from "@/lib/relative-time";

/**
 * A point in time as text that stays current. Before mount (and whenever `now`
 * is unavailable) it shows the absolute date and time, so server and client
 * markup match. `style` picks the phrasing:
 * - "short" (default): "in 15 min", "today 14:20", "Thu 14:20", or the date.
 * - "long": "3 weeks ago", "in 2 days" for spans, otherwise the short form.
 * The element is a <time> whose title is the absolute value.
 */
export function RelativeTime({
  iso,
  now,
  style = "short",
  showAbsolute = false,
  className,
}: {
  iso: string;
  /** Epoch ms from a parent's clock. Omit to use the shared 30 s clock. */
  now?: number | null;
  style?: "short" | "long";
  /** Appends the absolute date and time in muted text. */
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
