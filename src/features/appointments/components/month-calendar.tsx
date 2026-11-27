"use client";

import { Flex, Text } from "@radix-ui/themes";
import {
  GlanceFooter,
  GlanceHeader,
  GlancePopover,
  GlanceSection,
  statusPresentation,
} from "@/components/glance";
import { PersonAvatar } from "@/components/ui/person-avatar";
import type { AppointmentListItem } from "../schemas";
import {
  ActionButtons,
  isMuted,
  Party,
  pillColorsFor,
  StatusDetails,
  timeSpan,
} from "./appointment-parts";
import { monthKeyOf } from "./appointment-range";
import type { GridCommon } from "./day-calendar";
import { viewFor } from "./day-calendar";
import { clockOf, dateKeyOf } from "./schedule-time";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PILLS_PER_DAY = 2;

export function itemsOn(items: AppointmentListItem[], dateKey: string) {
  return items
    .filter((item) => dateKeyOf(item.appointmentDateTime) === dateKey)
    .sort(
      (a, b) =>
        Date.parse(a.appointmentDateTime) - Date.parse(b.appointmentDateTime),
    );
}

export function MonthCalendar({
  days,
  monthDate,
  todayKey,
  selectedKey,
  items,
  compact,
  canBook,
  onSelectDay,
  onBookDay,
  ...common
}: GridCommon & {
  days: string[];
  monthDate: string;
  todayKey: string | null;
  selectedKey: string;
  items: AppointmentListItem[];
  compact: boolean;
  canBook: boolean;
  onSelectDay: (dateKey: string) => void;
  onBookDay: (dateKey: string) => void;
}) {
  const month = monthKeyOf(monthDate);

  return (
    <div
      className="rounded-2xl bg-[var(--mp-surface)]"
      style={{ border: "1px solid var(--mp-paper-deep)" }}
    >
      <div
        className="grid grid-cols-7"
        style={{ borderBottom: "1px solid var(--mp-paper-deep)" }}
        aria-hidden="true"
      >
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="px-2 py-2 text-center text-xs font-semibold"
            style={{ color: "var(--mp-muted)" }}
          >
            {day}
          </div>
        ))}
      </div>
      <section className="grid grid-cols-7" aria-label="Month">
        {days.map((day) => {
          const inMonth = monthKeyOf(day) === month;
          const isToday = day === todayKey;
          const isSelected = day === selectedKey;
          const dayItems = itemsOn(items, day);
          const empty = dayItems.length === 0;
          const bookable =
            canBook && empty && todayKey !== null && day >= todayKey;
          const shown = compact ? [] : dayItems.slice(0, PILLS_PER_DAY);
          const hidden = dayItems.length - shown.length;
          return (
            <div
              key={day}
              className="relative min-h-20 min-w-0 p-1 sm:min-h-28"
              style={{
                borderRight: "1px solid var(--mp-paper-deep)",
                borderBottom: "1px solid var(--mp-paper-deep)",
                background: isSelected
                  ? "var(--mp-primary-tint)"
                  : "var(--mp-surface)",
                opacity: inMonth ? 1 : 0.45,
              }}
            >
              <button
                type="button"
                onClick={() => (bookable ? onBookDay(day) : onSelectDay(day))}
                aria-label={
                  bookable
                    ? `Book on ${day}`
                    : `${day}, ${dayItems.length} visit${dayItems.length === 1 ? "" : "s"}`
                }
                className="absolute inset-0 cursor-pointer rounded-none bg-transparent focus-visible:outline-2 focus-visible:-outline-offset-2"
                style={{ outlineColor: "var(--mp-ink)" }}
              />
              <div className="pointer-events-none relative flex flex-col gap-1">
                <span
                  className="inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums"
                  style={{
                    background: isToday ? "var(--mp-primary)" : "transparent",
                    color: isToday ? "var(--mp-on-primary)" : "var(--mp-ink)",
                  }}
                >
                  {Number(day.slice(8))}
                </span>

                {compact ? (
                  <span className="flex flex-wrap gap-0.5" aria-hidden="true">
                    {dayItems.slice(0, 4).map((item) => (
                      <span
                        key={item.id}
                        className="inline-block size-1.5 rounded-full"
                        style={{ background: pillColorsFor(item.status).color }}
                      />
                    ))}
                  </span>
                ) : (
                  <>
                    {shown.map((item) => (
                      <span
                        key={item.id}
                        className="pointer-events-auto min-w-0"
                      >
                        <MonthPill item={item} {...common} />
                      </span>
                    ))}
                    {hidden > 0 && (
                      <span
                        className="pointer-events-none text-[11px] font-medium"
                        style={{ color: "var(--mp-primary)" }}
                      >
                        +{hidden} more
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </section>
      <span className="sr-only">Showing {monthNameOf(monthDate)}</span>
    </div>
  );
}

function monthNameOf(dateKey: string) {
  const [y, m] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function MonthPill({
  item,
  ...common
}: { item: AppointmentListItem } & GridCommon) {
  const view = viewFor(item, common);
  const colors = pillColorsFor(item.status);
  const name =
    common.scope.mode === "patient" ? item.providerName : item.patientName;
  const status = statusPresentation("appointment", item.status).label;
  return (
    <GlancePopover
      label={`${status} visit at ${clockOf(item.appointmentDateTime)} with ${name}, show details`}
      width={300}
      trigger={
        <span
          className={`block truncate rounded-full px-1.5 py-0.5 text-left text-[11px] font-medium ${isMuted(item.status) ? "line-through" : ""}`}
          style={colors}
        >
          {clockOf(item.appointmentDateTime)} {name}
        </span>
      }
    >
      {() => (
        <>
          <GlanceHeader
            avatar={<PersonAvatar name={name} size={44} />}
            title={name}
            subtitle={timeSpan(item.appointmentDateTime, 20)}
          />
          <GlanceSection>
            <Flex direction="column" gap="2">
              <Text size="2" style={{ color: "var(--mp-ink)" }}>
                {status}
              </Text>
              <Party item={item} scope={common.scope} variant="inline" />
              <StatusDetails item={item} showAllergy={view.showAllergy} />
            </Flex>
          </GlanceSection>
          <GlanceFooter>
            <ActionButtons
              item={item}
              actions={view.actions}
              onAct={view.onAct}
              onEdit={view.onEdit}
              size="1"
            />
          </GlanceFooter>
        </>
      )}
    </GlancePopover>
  );
}
