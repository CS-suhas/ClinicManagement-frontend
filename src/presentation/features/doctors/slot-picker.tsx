"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { Flex, Heading, IconButton, Text } from "@radix-ui/themes";
import { useRef } from "react";
import { type SlotPeriod, type TimeSlot, toDateKey } from "./time-slots";

const PERIODS: SlotPeriod[] = ["Morning", "Afternoon", "Evening"];

function dayLabel(day: Date, today: Date) {
  const diff = Math.round(
    (new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime() -
      new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      ).getTime()) /
      86_400_000,
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return day.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function LegendSwatch({
  kind,
  children,
}: {
  kind: "booked" | "available" | "selected";
  children: string;
}) {
  const style = {
    booked: {
      background: "var(--mp-paper-deep)",
      border: "1px solid var(--mp-paper-deep)",
    },
    available: { background: "#fff", border: "1px solid var(--gray-7)" },
    selected: { background: "#fff", border: "2px solid var(--mp-primary)" },
  }[kind];
  return (
    <Flex align="center" gap="2">
      <span
        aria-hidden="true"
        className="inline-block h-3.5 w-3.5 rounded-[3px]"
        style={style}
      />
      <Text size="1" color="gray">
        {children}
      </Text>
    </Flex>
  );
}

export function SlotPicker({
  days,
  dateKey,
  onDateChange,
  slots,
  selected,
  onSelect,
}: {
  days: Date[];
  dateKey: string;
  onDateChange: (dateKey: string) => void;
  slots: TimeSlot[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const strip = useRef<HTMLDivElement>(null);
  const today = days[0] ?? new Date();
  const scroll = (direction: -1 | 1) =>
    strip.current?.scrollBy({ left: direction * 240, behavior: "smooth" });

  const groups = PERIODS.map((period) => ({
    period,
    slots: slots.filter((slot) => slot.period === period),
  })).filter((group) => group.slots.length > 0);

  return (
    <section
      aria-label="Select a date and time slot"
      className="rounded-xl bg-white p-4"
      style={{ border: "1px solid var(--mp-paper-deep)" }}
    >
      <Heading as="h3" size="3" mb="3">
        Select a date and time slot
      </Heading>

      <Flex align="center" gap="1">
        <IconButton
          variant="ghost"
          color="gray"
          aria-label="Earlier dates"
          onClick={() => scroll(-1)}
        >
          <ChevronLeftIcon />
        </IconButton>
        <div
          ref={strip}
          role="tablist"
          aria-label="Date"
          className="flex flex-1 gap-1 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {days.map((day) => {
            const key = toDateKey(day);
            const active = key === dateKey;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onDateChange(key)}
                className="shrink-0 cursor-pointer whitespace-nowrap bg-transparent px-3 py-2 text-sm"
                style={{
                  color: active ? "var(--mp-primary)" : "var(--mp-ink)",
                  fontWeight: active ? 600 : 400,
                  borderBottom: `2px solid ${active ? "var(--mp-primary)" : "transparent"}`,
                }}
              >
                {dayLabel(day, today)}
              </button>
            );
          })}
        </div>
        <IconButton
          variant="ghost"
          color="gray"
          aria-label="Later dates"
          onClick={() => scroll(1)}
        >
          <ChevronRightIcon />
        </IconButton>
      </Flex>

      <div className="mt-4 min-h-40">
        {groups.length === 0 ? (
          <Text as="p" size="2" color="gray">
            No time slots are open on this day. Pick another date.
          </Text>
        ) : (
          groups.map((group) => (
            <div key={group.period} className="mb-4">
              <Text
                as="p"
                size="2"
                weight="bold"
                mb="2"
                style={{ color: "var(--mp-primary)" }}
              >
                {group.period}
              </Text>
              <div className="flex flex-wrap gap-2">
                {group.slots.map((slot) => {
                  const isSelected = slot.value === selected;
                  return (
                    <button
                      key={slot.value}
                      type="button"
                      disabled={slot.unavailable}
                      aria-pressed={isSelected}
                      onClick={() => onSelect(slot.value)}
                      className="min-w-24 cursor-pointer rounded-md px-4 py-2 text-sm disabled:cursor-not-allowed"
                      style={{
                        color: slot.unavailable
                          ? "var(--gray-9)"
                          : "var(--mp-ink)",
                        background: slot.unavailable
                          ? "var(--mp-paper-deep)"
                          : "#fff",
                        border: isSelected
                          ? "2px solid var(--mp-primary)"
                          : `1px solid ${slot.unavailable ? "var(--mp-paper-deep)" : "var(--gray-7)"}`,
                        fontWeight: isSelected ? 600 : 400,
                      }}
                    >
                      {slot.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <Flex justify="center" gap="5" mt="2">
        <LegendSwatch kind="booked">Booked</LegendSwatch>
        <LegendSwatch kind="available">Available</LegendSwatch>
        <LegendSwatch kind="selected">Selected</LegendSwatch>
      </Flex>
    </section>
  );
}
