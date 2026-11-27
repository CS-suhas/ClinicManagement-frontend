"use client";

import type { ReactNode } from "react";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
};

export function SegmentedToggle<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  ariaLabel: string;
}) {
  return (
    <fieldset
      aria-label={ariaLabel}
      className="m-0 inline-flex min-w-0 gap-1 rounded-full bg-[var(--mp-surface)] p-1"
      style={{ border: "1px solid var(--mp-paper-deep)" }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              background: selected ? "var(--mp-primary)" : "transparent",
              color: selected ? "var(--mp-on-primary)" : "var(--mp-muted)",
              outlineColor: "var(--mp-ink)",
            }}
          >
            {option.icon ? (
              <>
                <span aria-hidden="true" className="inline-flex">
                  {option.icon}
                </span>
                <span className="sr-only">{option.label}</span>
              </>
            ) : (
              option.label
            )}
          </button>
        );
      })}
    </fieldset>
  );
}
