"use client";

import type { AppointmentListItem } from "@/domain/repositories";
import { Surface } from "@/presentation/components/ui/surface";
import { NowLine } from "./now-line";
import type { ScheduleColumn } from "./schedule-columns";
import {
  CALENDAR_PX_PER_MINUTE,
  type ClinicWindow,
  clock24,
  minutesOfDay,
  toneOf,
} from "./schedule-time";

const GUTTER = 64;
const COLUMN_MIN_WIDTH = 200;
const HOUR = 60 * CALENDAR_PX_PER_MINUTE;

export function DayCalendar({
  columns,
  items,
  clinic,
  nowOffset,
  toneOrder,
  onEdit,
}: {
  columns: ScheduleColumn[];
  items: AppointmentListItem[];
  clinic: ClinicWindow;
  /** Minutes from clinic opening to now, or null when the line is hidden. */
  nowOffset: number | null;
  /** Provider ids in display order, which set the accent colours. */
  toneOrder: string[];
  /** Given only for roles that may edit; blocks are read-only otherwise. */
  onEdit?: (item: AppointmentListItem) => void;
}) {
  const { opening, closing, duration } = clinic;
  const height = (closing - opening) * CALENDAR_PX_PER_MINUTE;
  const hourMarks: number[] = [];
  for (let minute = opening; minute < closing; minute += 60)
    hourMarks.push(minute);

  return (
    <Surface padding="none" className="overflow-hidden">
      <div className="overflow-x-auto">
        <div style={{ minWidth: GUTTER + columns.length * COLUMN_MIN_WIDTH }}>
          <div
            className="flex"
            style={{ borderBottom: "1px solid var(--mp-paper-deep)" }}
          >
            <div className="shrink-0" style={{ width: GUTTER }} />
            {columns.map((column) => (
              <div
                key={column.id}
                className="flex min-w-0 flex-1 items-center gap-2 px-3 py-3"
                style={{
                  minWidth: COLUMN_MIN_WIDTH,
                  borderLeft: "1px solid var(--mp-paper-deep)",
                }}
              >
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: toneOf(column.id, toneOrder) }}
                />
                <div className="min-w-0">
                  <div
                    className="truncate text-sm font-semibold"
                    style={{ color: "var(--mp-ink)" }}
                  >
                    {column.isYou ? "You" : column.name}
                  </div>
                  {column.specialty && (
                    <div
                      className="truncate text-xs"
                      style={{ color: "var(--mp-muted)" }}
                    >
                      {column.specialty}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div
            className="relative flex"
            style={{
              height,
              backgroundImage: `repeating-linear-gradient(to bottom, var(--mp-paper-deep) 0 1px, transparent 1px ${HOUR}px)`,
            }}
          >
            <div className="relative shrink-0" style={{ width: GUTTER }}>
              {hourMarks.map((minute) => (
                <span
                  key={minute}
                  className="absolute right-2 text-xs tabular-nums"
                  style={{
                    top: (minute - opening) * CALENDAR_PX_PER_MINUTE + 4,
                    color: "var(--mp-muted)",
                  }}
                >
                  {clock24(minute)}
                </span>
              ))}
            </div>

            {columns.map((column) => (
              <div
                key={column.id}
                className="relative min-w-0 flex-1"
                style={{
                  minWidth: COLUMN_MIN_WIDTH,
                  borderLeft: "1px solid var(--mp-paper-deep)",
                }}
              >
                {items
                  .filter((item) => item.providerId === column.id)
                  .map((item) => {
                    const start = minutesOfDay(
                      Date.parse(item.appointmentDateTime),
                    );
                    const tone = toneOf(item.providerId, toneOrder);
                    const style = {
                      top: (start - opening) * CALENDAR_PX_PER_MINUTE + 1,
                      height: duration * CALENDAR_PX_PER_MINUTE - 2,
                      left: 4,
                      right: 4,
                      background: `color-mix(in srgb, ${tone} 10%, white)`,
                      borderLeft: `3px solid ${tone}`,
                    };
                    const body = (
                      <>
                        <span
                          className="block truncate text-xs font-semibold leading-tight"
                          style={{ color: "var(--mp-ink)" }}
                        >
                          {item.patientName}
                        </span>
                        <span
                          className="block truncate text-[11px] leading-tight"
                          style={{ color: "var(--mp-muted)" }}
                        >
                          {item.reasonForVisit || "No reason given"}
                        </span>
                      </>
                    );
                    if (!onEdit)
                      return (
                        <div
                          key={item.id}
                          title={`${item.patientName} · ${item.reasonForVisit}`}
                          className="absolute overflow-hidden rounded-md px-1.5 py-0.5"
                          style={style}
                        >
                          {body}
                        </div>
                      );
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onEdit(item)}
                        aria-label={`Edit appointment for ${item.patientName}`}
                        title={`${item.patientName} · ${item.reasonForVisit}`}
                        className="absolute cursor-pointer overflow-hidden rounded-md px-1.5 py-0.5 text-left transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-1"
                        style={{ ...style, outlineColor: "var(--mp-ink)" }}
                      >
                        {body}
                      </button>
                    );
                  })}
              </div>
            ))}

            {nowOffset !== null && (
              <NowLine top={nowOffset * CALENDAR_PX_PER_MINUTE} left={GUTTER} />
            )}
          </div>
        </div>
      </div>
    </Surface>
  );
}
