"use client";

import { ChevronRightIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import type { ReactNode } from "react";
import { IconCircle } from "@/components/ui/icon-circle";

export type LinkTone = "default" | "attention" | "alert";

const TONE_PILL: Record<LinkTone, { background: string; color: string }> = {
  default: { background: "var(--mp-primary-tint)", color: "var(--mp-primary)" },
  attention: { background: "var(--mp-amber-bg)", color: "var(--mp-amber-ink)" },
  alert: { background: "var(--mp-red-bg)", color: "var(--mp-red-ink)" },
};

/**
 * A whole card that links somewhere: icon, title, one line of hint and an
 * optional count pill. The count only shows when the caller has one.
 */
export function QuickLinkCard({
  href,
  icon,
  title,
  hint,
  count,
  tone = "default",
}: {
  href: string;
  icon: ReactNode;
  title: string;
  hint?: string;
  /** Null or undefined hides the pill. */
  count?: number | null;
  tone?: LinkTone;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-2xl bg-[var(--mp-surface)] p-4 no-underline transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        border: "1px solid var(--mp-paper-deep)",
        color: "var(--mp-ink)",
        outlineColor: "var(--mp-ink)",
      }}
    >
      <IconCircle size={40}>{icon}</IconCircle>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{title}</span>
          {count !== undefined && count !== null && (
            <span
              className="inline-flex min-w-6 items-center justify-center rounded-full px-2 text-xs font-semibold tabular-nums"
              style={TONE_PILL[tone]}
            >
              {count}
            </span>
          )}
        </span>
        {hint && (
          <span
            className="mt-1 block text-sm"
            style={{ color: "var(--mp-muted)" }}
          >
            {hint}
          </span>
        )}
      </span>
      <ChevronRightIcon
        aria-hidden="true"
        className="mt-2 shrink-0"
        style={{ color: "var(--mp-muted)" }}
      />
    </Link>
  );
}
