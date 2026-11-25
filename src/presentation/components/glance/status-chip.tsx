"use client";

import { Flex, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";
import type { AppointmentStatus } from "@/domain/entities";
import { RelativeTime } from "../ui/relative-time";
import {
  GlanceFooter,
  GlanceHeader,
  GlancePopover,
  GlanceSection,
} from "./glance-popover";

export type StatusKind = "appointment" | "verification" | "joinRequest";

type Palette = { background: string; color: string };

const PALETTE = {
  amber: { background: "var(--mp-amber-bg)", color: "var(--mp-amber-ink)" },
  teal: { background: "var(--mp-teal-bg)", color: "var(--mp-teal-ink)" },
  red: { background: "var(--mp-red-bg)", color: "var(--mp-red-ink)" },
  slate: { background: "var(--mp-slate-bg)", color: "var(--mp-slate-ink)" },
  blue: { background: "var(--mp-blue-bg)", color: "var(--mp-blue-ink)" },
} satisfies Record<string, Palette>;

type Tone = keyof typeof PALETTE;

export interface StatusPresentation {
  label: string;
  tone: Tone;
  glyph: string;
}

const KIND_TITLE: Record<StatusKind, string> = {
  appointment: "Appointment",
  verification: "Doctor approval",
  joinRequest: "Clinic move request",
};

const PRESENTATION: Record<StatusKind, Record<string, StatusPresentation>> = {
  appointment: {
    REQUESTED: { label: "Pending", tone: "amber", glyph: "◷" },
    CONFIRMED: { label: "Accepted", tone: "teal", glyph: "✓" },
    DECLINED: { label: "Rejected", tone: "red", glyph: "✕" },
    CANCELLED: { label: "Cancelled", tone: "slate", glyph: "–" },
    COMPLETED: { label: "Completed", tone: "blue", glyph: "✓" },
  },
  verification: {
    PENDING: { label: "Pending", tone: "amber", glyph: "◷" },
    VERIFIED: { label: "Verified", tone: "teal", glyph: "✓" },
    REJECTED: { label: "Rejected", tone: "red", glyph: "✕" },
  },
  joinRequest: {
    PENDING: { label: "Pending", tone: "amber", glyph: "◷" },
    APPROVED: { label: "Approved", tone: "teal", glyph: "✓" },
    REJECTED: { label: "Rejected", tone: "red", glyph: "✕" },
    CANCELLED: { label: "Cancelled", tone: "slate", glyph: "–" },
  },
};

/** UI label, colour tone and glyph for a raw API status. Unknown values read as-is. */
export function statusPresentation(
  kind: StatusKind,
  status: string,
): StatusPresentation {
  return (
    PRESENTATION[kind][status] ?? {
      label: status,
      tone: "slate",
      glyph: "?",
    }
  );
}

/** UI label for an appointment status, e.g. "Accepted" for CONFIRMED. */
export const appointmentLabel = (status: AppointmentStatus) =>
  statusPresentation("appointment", status).label;

/** The terminal line shown under a rejected or cancelled status. Null for other states. */
function defaultNote(kind: StatusKind, status: string): string | null {
  if (kind === "appointment" && status === "DECLINED")
    return "Rejected by the doctor. No reason is recorded.";
  if (kind === "verification" && status === "REJECTED")
    return "Not approved. Contact your clinic administrator.";
  if (kind === "joinRequest" && status === "REJECTED")
    return "Declined by the clinic. No reason is recorded.";
  return null;
}

/**
 * A status as a coloured pill with a glyph and its label, never colour alone.
 * Non-interactive; use it inside cards or where no detail is needed.
 */
export function StatusPill({
  kind,
  status,
  className,
}: {
  kind: StatusKind;
  status: string;
  className?: string;
}) {
  const presentation = statusPresentation(kind, status);
  const palette = PALETTE[presentation.tone];
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[12px] font-semibold ${className ?? ""}`}
      style={palette}
    >
      <span aria-hidden="true">{presentation.glyph}</span>
      {presentation.label}
    </span>
  );
}

const APPOINTMENT_STEPS = ["Requested", "Accepted", "Completed"] as const;
const STEP_INDEX: Partial<Record<string, number>> = {
  REQUESTED: 0,
  CONFIRMED: 1,
  COMPLETED: 2,
};

/** Requested > Accepted > Completed, with Rejected or Cancelled as a terminal branch. */
function AppointmentStepper({ status }: { status: string }) {
  const current = STEP_INDEX[status];
  const branch =
    status === "DECLINED" || status === "CANCELLED"
      ? statusPresentation("appointment", status).label
      : null;
  return (
    <ol
      aria-label="Appointment progress"
      className="flex flex-wrap items-center gap-1.5 text-[12px]"
    >
      {APPOINTMENT_STEPS.map((step, index) => {
        const done = current !== undefined && index < current;
        const active = index === current;
        return (
          <li
            key={step}
            aria-current={active ? "step" : undefined}
            className="flex items-center gap-1.5"
            style={{
              color: active || done ? "var(--mp-ink)" : "var(--mp-muted)",
              fontWeight: active ? 600 : 400,
            }}
          >
            <span
              aria-hidden="true"
              className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px]"
              style={{
                background:
                  done || active ? "var(--mp-primary)" : "var(--mp-paper-deep)",
                color:
                  done || active ? "var(--mp-on-primary)" : "var(--mp-muted)",
              }}
            >
              {done ? "✓" : index + 1}
            </span>
            {step}
            {index < APPOINTMENT_STEPS.length - 1 && (
              <span aria-hidden="true" style={{ color: "var(--mp-muted)" }}>
                ›
              </span>
            )}
          </li>
        );
      })}
      {branch && (
        <li
          className="font-semibold"
          style={{
            color:
              PALETTE[statusPresentation("appointment", status).tone].color,
          }}
        >
          › {branch}
        </li>
      )}
    </ol>
  );
}

/**
 * A status pill that opens a card: the stepper (appointments), a relative
 * time line, the terminal note, any extra details and the card's actions.
 * Actions are passed in by the caller, who knows the user's permissions.
 */
export function StatusChip({
  kind,
  status,
  at,
  atLabel = "Starts",
  details,
  actions,
  note,
  interactive = true,
  label,
  onOpen,
}: {
  kind: StatusKind;
  /** The raw API status, e.g. "REQUESTED". */
  status: string;
  /** ISO time shown as a relative line, e.g. the appointment start. */
  at?: string | null;
  /** Words before the relative time, e.g. "Starts", "Requested". */
  atLabel?: string;
  /** Extra rows, e.g. timestamps the backend has. */
  details?: ReactNode;
  /** Footer buttons. The caller filters them by role and status. */
  actions?: ReactNode;
  /** Overrides the default terminal line. */
  note?: string;
  /** False renders only the pill. Use it where a popover would be out of place. */
  interactive?: boolean;
  /** Accessible name of the trigger. Defaults to the kind and status. */
  label?: string;
  onOpen?: () => void;
}) {
  if (!interactive) return <StatusPill kind={kind} status={status} />;
  const presentation = statusPresentation(kind, status);
  const terminalNote = note ?? defaultNote(kind, status);
  return (
    <GlancePopover
      label={
        label ?? `${KIND_TITLE[kind]}: ${presentation.label}, show details`
      }
      onOpen={onOpen}
      width={300}
      trigger={<StatusPill kind={kind} status={status} />}
    >
      {() => (
        <>
          <GlanceHeader
            avatar={
              <span
                aria-hidden="true"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[15px] font-semibold"
                style={PALETTE[presentation.tone]}
              >
                {presentation.glyph}
              </span>
            }
            title={`${KIND_TITLE[kind]}: ${presentation.label}`}
          />
          <GlanceSection>
            <Flex direction="column" gap="3">
              {kind === "appointment" && <AppointmentStepper status={status} />}
              {at && (
                <Text size="2" style={{ color: "var(--mp-ink)" }}>
                  {atLabel} <RelativeTime iso={at} style="long" />
                </Text>
              )}
              {terminalNote && (
                <Text size="2" style={{ color: "var(--mp-muted)" }}>
                  {terminalNote}
                </Text>
              )}
              {details}
            </Flex>
          </GlanceSection>
          {actions && <GlanceFooter>{actions}</GlanceFooter>}
        </>
      )}
    </GlancePopover>
  );
}
