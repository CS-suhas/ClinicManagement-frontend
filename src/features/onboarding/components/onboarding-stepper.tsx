"use client";

import { CheckIcon } from "@radix-ui/react-icons";

/** Labelled steps with the current one marked for assistive technology. */
export function OnboardingStepper({
  labels,
  current,
}: {
  labels: string[];
  current: number;
}) {
  return (
    <nav aria-label="Onboarding progress">
      <ol className="m-0 flex list-none items-center gap-3 p-0">
        {labels.map((label, index) => {
          const done = index < current;
          const active = index === current;
          const lit = done || active;
          return (
            <li
              key={label}
              aria-current={active ? "step" : undefined}
              className="flex min-w-0 flex-1 items-center gap-2"
            >
              <span
                aria-hidden="true"
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                style={{
                  background: lit
                    ? "var(--mp-primary)"
                    : "var(--mp-paper-deep)",
                  color: lit ? "var(--mp-on-primary)" : "var(--mp-muted)",
                }}
              >
                {done ? <CheckIcon width={14} height={14} /> : index + 1}
              </span>
              <span
                className="truncate text-xs font-medium"
                style={{ color: active ? "var(--mp-ink)" : "var(--mp-muted)" }}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
