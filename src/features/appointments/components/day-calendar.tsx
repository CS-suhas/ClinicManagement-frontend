"use client";

import type { AppointmentScope } from "@/application/services/appointment-service";
import { Surface } from "@/components/ui/surface";
import type { AppointmentAction } from "@/domain/entities";
import type { AppointmentListItem } from "@/domain/repositories";
import {
  AppointmentBlock,
  type AppointmentViewProps,
} from "./appointment-parts";
import { NowLine } from "./now-line";
import type { ScheduleColumn } from "./schedule-columns";
import {
  type ClinicWindow,
  calendarPxPerMinute,
  clock24,
  minutesOfDay,
  toneOf,
} from "./schedule-time";

const GUTTER = 64;
const COLUMN_MIN_WIDTH = 200;

/** Shared inputs for the block grids. */
export type GridCommon = {
  scope: AppointmentScope;
  now: number | null;
  actionsFor: (item: AppointmentListItem) => AppointmentAction[];
  onAct: (item: AppointmentListItem, action: AppointmentAction) => void;
  onEdit?: (item: AppointmentListItem) => void;
  showAllergy: boolean;
};

/** One day as provider columns. Admins see every doctor; a doctor sees only their own column. */
export function DayCalendar({
  columns,
  items,
  clinic,
  nowOffset,
  toneOrder,
  ...common
}: GridCommon & {
  columns: ScheduleColumn[];
  items: AppointmentListItem[];
  clinic: ClinicWindow;
  /** Minutes from clinic opening to now, or null when the line is hidden. */
  nowOffset: number | null;
  /** Provider ids in display order, which set the accent colours. */
  toneOrder: string[];
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
                    const blockHeight = duration * scale - 2;
                    return (
                      <AppointmentBlock
                        key={item.id}
                        view={viewFor(item, common)}
                        duration={duration}
                        accent={toneOf(item.providerId, toneOrder)}
                        tall={blockHeight >= 80}
                        style={{
                          top: (start - opening) * scale + 1,
                          height: blockHeight,
                          left: 4,
                          right: 4,
                        }}
                      />
                    );
                  })}
              </div>
            ))}

            {nowOffset !== null && (
              <NowLine top={nowOffset * scale} left={GUTTER} />
            )}
          </div>
        </div>
      </div>
    </Surface>
  );
}

/** Builds the per-item props a block or card needs from the shared inputs. */
export function viewFor(
  item: AppointmentListItem,
  common: GridCommon,
): AppointmentViewProps {
  return {
    item,
    scope: common.scope,
    now: common.now,
    actions: common.actionsFor(item),
    onAct: common.onAct,
    onEdit: common.onEdit,
    showAllergy: common.showAllergy,
  };
}
