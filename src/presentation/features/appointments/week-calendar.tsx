"use client";

import type { AppointmentListItem } from "@/domain/repositories";
import { Surface } from "@/presentation/components/ui/surface";
import { AppointmentBlock } from "./appointment-parts";
import { dayHeading } from "./appointment-range";
import { type GridCommon, viewFor } from "./day-calendar";
import { NowLine } from "./now-line";
import {
  type ClinicWindow,
  calendarPxPerMinute,
  clock24,
  dateKeyOf,
  minutesOfDay,
} from "./schedule-time";

const GUTTER = 56;
const DAY_MIN_WIDTH = 120;
const ACCENT = "var(--mp-primary)";

/**
 * Seven day columns (Monday to Sunday) of one doctor's own visits. Blocks sit at
 * their start time; today's column is tinted and carries the now-line.
 */
export function WeekCalendar({
  days,
  todayKey,
  items,
  clinic,
  nowOffset,
  onPickDay,
  ...common
}: GridCommon & {
  /** Seven "YYYY-MM-DD" keys, Monday first. */
  days: string[];
  todayKey: string | null;
  items: AppointmentListItem[];
  clinic: ClinicWindow;
  nowOffset: number | null;
  /** Opens the day view for a column header. */
  onPickDay: (dateKey: string) => void;
}) {
  const { opening, closing, duration } = clinic;
  const scale = calendarPxPerMinute(duration);
  const hour = 60 * scale;
  const height = (closing - opening) * scale;
  const hourMarks: number[] = [];
  for (let minute = opening; minute < closing; minute += 60)
    hourMarks.push(minute);

  return (
    <Surface padding="none" className="overflow-hidden">
      <div className="overflow-x-auto">
        <div style={{ minWidth: GUTTER + days.length * DAY_MIN_WIDTH }}>
          <div
            className="flex"
            style={{ borderBottom: "1px solid var(--mp-paper-deep)" }}
          >
            <div className="shrink-0" style={{ width: GUTTER }} />
            {days.map((day) => {
              const isToday = day === todayKey;
              return (
                <div
                  key={day}
                  className="min-w-0 flex-1"
                  style={{
                    minWidth: DAY_MIN_WIDTH,
                    borderLeft: "1px solid var(--mp-paper-deep)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onPickDay(day)}
                    aria-label={`Open ${dayHeading(day)} in day view`}
                    className="flex w-full cursor-pointer flex-col items-start px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
                    style={{
                      background: isToday
                        ? "var(--mp-primary-tint)"
                        : "transparent",
                      color: isToday ? "var(--mp-primary)" : "var(--mp-ink)",
                      outlineColor: "var(--mp-ink)",
                    }}
                  >
                    <span className="text-sm font-semibold">
                      {dayHeading(day)}
                    </span>
                    {isToday && (
                      <span className="text-[11px] font-semibold">Today</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <div
            className="relative flex"
            style={{
              height,
              backgroundImage: `repeating-linear-gradient(to bottom, var(--mp-paper-deep) 0 1px, transparent 1px ${hour}px)`,
            }}
          >
            <div className="relative shrink-0" style={{ width: GUTTER }}>
              {hourMarks.map((minute) => (
                <span
                  key={minute}
                  className="absolute right-2 text-xs tabular-nums"
                  style={{
                    top: (minute - opening) * scale + 4,
                    color: "var(--mp-muted)",
                  }}
                >
                  {clock24(minute)}
                </span>
              ))}
            </div>

            {days.map((day) => {
              const isToday = day === todayKey;
              const dayItems = items.filter(
                (item) => dateKeyOf(item.appointmentDateTime) === day,
              );
              return (
                <div
                  key={day}
                  className="relative min-w-0 flex-1"
                  style={{
                    minWidth: DAY_MIN_WIDTH,
                    borderLeft: "1px solid var(--mp-paper-deep)",
                    background: isToday
                      ? "color-mix(in srgb, var(--mp-primary-tint) 45%, transparent)"
                      : undefined,
                  }}
                >
                  {dayItems.map((item) => {
                    const start = minutesOfDay(
                      Date.parse(item.appointmentDateTime),
                    );
                    const blockHeight = duration * scale - 2;
                    return (
                      <AppointmentBlock
                        key={item.id}
                        view={viewFor(item, common)}
                        duration={duration}
                        accent={ACCENT}
                        tall={blockHeight >= 80}
                        style={{
                          top: (start - opening) * scale + 1,
                          height: blockHeight,
                          left: 3,
                          right: 3,
                        }}
                      />
                    );
                  })}
                  {isToday && nowOffset !== null && (
                    <NowLine top={nowOffset * scale} left={0} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Surface>
  );
}
