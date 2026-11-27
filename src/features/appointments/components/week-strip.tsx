"use client";

import { dayHeading } from "./appointment-range";

export function WeekStrip({
  days,
  todayKey,
  selectedKey,
  onSelect,
}: {
  days: string[];
  todayKey: string | null;
  selectedKey: string;
  onSelect: (dateKey: string) => void;
}) {
  return (
    <section aria-label="Week" className="grid grid-cols-7 gap-1">
      {days.map((day) => {
        const selected = day === selectedKey;
        const isToday = day === todayKey;
        return (
          <button
            key={day}
            type="button"
            onClick={() => onSelect(day)}
            aria-pressed={selected}
            aria-label={dayHeading(day)}
            className="flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-xl text-xs"
            style={{
              background: selected ? "var(--mp-primary)" : "var(--mp-surface)",
              color: selected ? "var(--mp-on-primary)" : "var(--mp-ink)",
              border: `${isToday && !selected ? 2 : 1}px solid ${isToday ? "var(--mp-primary)" : "var(--mp-paper-deep)"}`,
            }}
          >
            <span className="font-medium">{dayHeading(day).split(" ")[0]}</span>
            <span className="text-sm font-semibold tabular-nums">
              {Number(day.slice(8))}
            </span>
          </button>
        );
      })}
    </section>
  );
}
