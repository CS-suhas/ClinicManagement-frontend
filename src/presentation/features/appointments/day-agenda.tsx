"use client";

import { Flex, Text } from "@radix-ui/themes";
import type { AppointmentListItem } from "@/domain/repositories";
import { Surface } from "@/presentation/components/ui/surface";
import { AppointmentCard } from "./appointment-parts";
import { dayHeading } from "./appointment-range";
import { type GridCommon, viewFor } from "./day-calendar";
import { itemsOn } from "./month-calendar";
import { toneOf } from "./schedule-time";

/** Chronological cards, grouped under a heading per local day. */
export function DayAgenda({
  items,
  days,
  todayKey,
  duration,
  showProvider,
  providerOrder,
  emptyText,
  ...common
}: GridCommon & {
  items: AppointmentListItem[];
  /** Days to show, in order. Days without visits are skipped. */
  days: string[];
  todayKey: string | null;
  duration: number;
  showProvider: boolean;
  providerOrder: string[];
  emptyText: string;
}) {
  const groups = days
    .map((day) => ({ day, items: itemsOn(items, day) }))
    .filter((group) => group.items.length > 0);

  if (groups.length === 0)
    return (
      <Surface>
        <Flex justify="center" py="6">
          <Text style={{ color: "var(--mp-muted)" }}>{emptyText}</Text>
        </Flex>
      </Surface>
    );

  return (
    <div className="flex flex-col gap-5">
      {groups.map(({ day, items: dayItems }) => (
        <section
          key={day}
          aria-label={dayHeading(day)}
          className="flex flex-col gap-3"
        >
          <h3
            className="sticky top-0 z-10 m-0 bg-[#f3f8f7] py-1 text-sm font-semibold"
            style={{
              color: day === todayKey ? "var(--mp-primary)" : "var(--mp-ink)",
            }}
          >
            {day === todayKey ? `Today · ${dayHeading(day)}` : dayHeading(day)}
          </h3>
          {dayItems.map((item) => (
            <AppointmentCard
              key={item.id}
              view={viewFor(item, common)}
              duration={duration}
              showProvider={showProvider}
              accent={toneOf(item.providerId, providerOrder)}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
