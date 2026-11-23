"use client";

import type { AppointmentListItem } from "@/domain/repositories";
import { PersonAvatar } from "@/presentation/components/ui/person-avatar";
import { Surface } from "@/presentation/components/ui/surface";
import { NowLine } from "./now-line";
import {
  AGENDA_PX_PER_MINUTE,
  type ClinicWindow,
  clock12,
  minutesOfDay,
  timeRange,
  toneOf,
} from "./schedule-time";

const LABEL_WIDTH = 88;

export function DayAgenda({
  items,
  clinic,
  nowOffset,
  nowMs,
  showProvider,
  toneOrder,
  onEdit,
}: {
  items: AppointmentListItem[];
  clinic: ClinicWindow;
  /** Minutes from clinic opening to now, or null when the line is hidden. */
  nowOffset: number | null;
  /** Null until mounted. Appointments starting after it are "upcoming". */
  nowMs: number | null;
  /** Show the provider name on each card (patients, or several providers). */
  showProvider: boolean;
  toneOrder: string[];
  /** Given only for roles that may edit; cards are read-only otherwise. */
  onEdit?: (item: AppointmentListItem) => void;
}) {
  const { opening, closing, duration } = clinic;
  const px = AGENDA_PX_PER_MINUTE;
  const height = (closing - opening) * px;
  const hourMarks: number[] = [];
  for (let minute = opening; minute < closing; minute += 60)
    hourMarks.push(minute);

  if (items.length === 0)
    return (
      <Surface>
        <p
          className="m-0 py-6 text-center text-sm"
          style={{ color: "var(--mp-muted)" }}
        >
          No appointments on this day.
        </p>
      </Surface>
    );

  return (
    <Surface padding="md">
      <div className="relative" style={{ height }}>
        {hourMarks.map((minute) => (
          <div
            key={minute}
            className="absolute inset-x-0"
            style={{ top: (minute - opening) * px }}
          >
            <span
              className="absolute -translate-y-1/2 whitespace-nowrap text-xs tabular-nums"
              style={{
                left: 0,
                width: LABEL_WIDTH - 12,
                textAlign: "right",
                color: "var(--mp-muted)",
              }}
            >
              {clock12(minute)}
            </span>
            <div
              className="absolute right-0 h-px"
              style={{ left: LABEL_WIDTH, background: "var(--mp-paper-deep)" }}
            />
          </div>
        ))}

        {items.map((item) => {
          const start = minutesOfDay(Date.parse(item.appointmentDateTime));
          const upcoming =
            nowMs !== null && Date.parse(item.appointmentDateTime) > nowMs;
          const tone = toneOf(item.providerId, toneOrder);
          const card = (
            <>
              <div className="flex items-start justify-between gap-3">
                <span
                  className="min-w-0 truncate text-sm font-semibold"
                  style={{ color: "var(--mp-ink)" }}
                >
                  {item.reasonForVisit || "Appointment"}
                </span>
                <span
                  className="shrink-0 text-xs tabular-nums"
                  style={{ color: "var(--mp-muted)" }}
                >
                  {timeRange(start, duration)}
                </span>
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <PersonAvatar name={item.patientName} size={20} />
                <span
                  className="min-w-0 truncate text-xs"
                  style={{ color: "var(--mp-ink)" }}
                >
                  {item.patientName}
                  {showProvider && (
                    <span style={{ color: "var(--mp-muted)" }}>
                      {" "}
                      · {item.providerName}
                    </span>
                  )}
                </span>
              </div>
            </>
          );
          const style = {
            top: (start - opening) * px,
            height: duration * px - 2,
            left: LABEL_WIDTH + 12,
            right: 0,
            background: upcoming ? "var(--mp-primary-tint)" : "#fff",
            border: "1px solid var(--mp-paper-deep)",
            borderLeft: `3px solid ${tone}`,
          };
          const className =
            "absolute flex flex-col justify-center gap-0.5 overflow-hidden rounded-xl px-3 py-1.5 text-left";
          if (!onEdit)
            return (
              <div key={item.id} className={className} style={style}>
                {card}
              </div>
            );
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onEdit(item)}
              aria-label={`Edit appointment for ${item.patientName}`}
              className={`${className} cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1`}
              style={{ ...style, outlineColor: "var(--mp-ink)" }}
            >
              {card}
            </button>
          );
        })}

        {nowOffset !== null && (
          <NowLine top={nowOffset * px} left={LABEL_WIDTH} />
        )}
      </div>
    </Surface>
  );
}
