"use client";

import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Button, Flex, Text } from "@radix-ui/themes";
import { addMinutes, parseISO } from "date-fns";
import type { CSSProperties } from "react";
import {
  DoctorChip,
  PatientChip,
  StatusChip,
  statusPresentation,
} from "@/components/glance";
import { RelativeTime } from "@/components/ui/relative-time";
import { severityLevel } from "@/components/ui/severity";
import { startsSoon } from "@/lib/relative-time";
import type {
  AppointmentAction,
  AppointmentListItem,
  AppointmentStatus,
} from "../schemas";
import type { AppointmentScope } from "../utils";
import { clockOf } from "./schedule-time";
import { ACTION_LABEL } from "./use-appointment-actions";

const AMBER = "var(--mp-warn)";
const RED = "var(--mp-danger)";

export const isMuted = (status: AppointmentStatus) =>
  status === "DECLINED" || status === "CANCELLED";

export function isSoon(item: AppointmentListItem, now: number | null) {
  if (now === null) return false;
  if (item.status !== "REQUESTED" && item.status !== "CONFIRMED") return false;
  return startsSoon(item.appointmentDateTime, now);
}

export function timeSpan(iso: string, duration: number) {
  const end = addMinutes(parseISO(iso), duration).toISOString();
  return `${clockOf(iso)} – ${clockOf(end)}`;
}

export function splitName(full: string) {
  const at = full.indexOf(" ");
  return at < 0
    ? { firstName: full, lastName: "" }
    : { firstName: full.slice(0, at), lastName: full.slice(at + 1) };
}

export function AllergyFlag({
  count,
  severity,
}: {
  count: number | undefined;
  severity: string | null | undefined;
}) {
  if (!count) return null;
  const severe = severityLevel(severity) === "SEVERE";
  const label = `${count} recorded allerg${count === 1 ? "y" : "ies"}${severe ? ", includes a severe one" : ""}`;
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="inline-flex shrink-0"
    >
      <ExclamationTriangleIcon
        aria-hidden="true"
        width={16}
        height={16}
        style={{ color: severe ? RED : AMBER }}
      />
    </span>
  );
}

export function Party({
  item,
  scope,
  variant = "inline",
}: {
  item: AppointmentListItem;
  scope: AppointmentScope;
  variant?: "chip" | "inline";
}) {
  if (scope.mode === "patient")
    return (
      <DoctorChip
        variant={variant}
        provider={{
          id: item.providerId,
          ...splitName(item.providerName),
          specialty: item.providerSpecialty,
          clinicId: item.clinicId,
          clinicName: item.clinicName,
        }}
      />
    );
  return (
    <PatientChip
      variant={variant}
      showAllergyFlag={false}
      patient={{
        id: item.patientId,
        name: item.patientName,
        highestSeverity: item.patientHighestAllergySeverity,
      }}
    />
  );
}

export function StatusDetails({
  item,
  showAllergy,
}: {
  item: AppointmentListItem;
  showAllergy: boolean;
}) {
  const count = item.patientAllergyCount ?? 0;
  return (
    <Flex direction="column" gap="1">
      {item.createdAtUtc && (
        <Text size="2" style={{ color: "var(--mp-muted)" }}>
          Requested <RelativeTime iso={item.createdAtUtc} style="long" />
        </Text>
      )}
      {item.statusChangedAtUtc && (
        <Text size="2" style={{ color: "var(--mp-muted)" }}>
          Status changed{" "}
          <RelativeTime iso={item.statusChangedAtUtc} style="long" />
        </Text>
      )}
      {showAllergy && (
        <Text
          size="2"
          style={{
            color:
              severityLevel(item.patientHighestAllergySeverity) === "SEVERE"
                ? RED
                : "var(--mp-ink)",
          }}
        >
          {count > 0
            ? `${count} recorded allerg${count === 1 ? "y" : "ies"}`
            : "No known allergies"}
        </Text>
      )}
    </Flex>
  );
}

export function ActionButtons({
  item,
  actions,
  onAct,
  onEdit,
  size = "2",
}: {
  item: AppointmentListItem;
  actions: AppointmentAction[];
  onAct: (item: AppointmentListItem, action: AppointmentAction) => void;
  onEdit?: (item: AppointmentListItem) => void;
  size?: "1" | "2";
}) {
  if (actions.length === 0 && !onEdit) return null;
  return (
    <Flex wrap="wrap" gap="2">
      {actions.map((action) => (
        <Button
          key={action}
          size={size}
          variant={
            action === "confirm" || action === "complete" ? "solid" : "outline"
          }
          color={
            action === "decline" ? "red" : action === "cancel" ? "gray" : "teal"
          }
          onClick={() => onAct(item, action)}
        >
          {ACTION_LABEL[action]}
        </Button>
      ))}
      {onEdit && (
        <Button
          size={size}
          variant="soft"
          color="gray"
          onClick={() => onEdit(item)}
        >
          Edit
        </Button>
      )}
    </Flex>
  );
}

export type AppointmentViewProps = {
  item: AppointmentListItem;
  scope: AppointmentScope;
  now: number | null;
  actions: AppointmentAction[];
  onAct: (item: AppointmentListItem, action: AppointmentAction) => void;
  onEdit?: (item: AppointmentListItem) => void;
  showAllergy: boolean;
};

export function AppointmentStatusChip(props: AppointmentViewProps) {
  const { item, actions, onAct, onEdit, showAllergy } = props;
  return (
    <StatusChip
      kind="appointment"
      status={item.status}
      at={item.appointmentDateTime}
      atLabel="Starts"
      label={`${statusPresentation("appointment", item.status).label} visit with ${item.patientName}, show details`}
      details={<StatusDetails item={item} showAllergy={showAllergy} />}
      actions={
        <ActionButtons
          item={item}
          actions={actions}
          onAct={onAct}
          onEdit={onEdit}
        />
      }
    />
  );
}

export function AppointmentBlock({
  view,
  style,
  accent,
  duration,
  tall,
}: {
  view: AppointmentViewProps;
  style: CSSProperties;
  accent: string;
  duration: number;
  tall: boolean;
}) {
  const { item, now, scope, showAllergy } = view;
  const muted = isMuted(item.status);
  const soon = isSoon(item, now);
  return (
    <div
      className="@container absolute flex flex-col gap-0.5 overflow-hidden rounded-md px-1.5 py-1"
      style={{
        ...style,
        background: muted
          ? "var(--mp-paper)"
          : `light-dark(color-mix(in srgb, ${accent} 10%, white), color-mix(in srgb, ${accent} 22%, var(--mp-surface)))`,
        borderTop: muted ? "1px dashed var(--mp-paper-deep)" : undefined,
        borderRight: muted ? "1px dashed var(--mp-paper-deep)" : undefined,
        borderBottom: muted ? "1px dashed var(--mp-paper-deep)" : undefined,
        borderLeft: `3px solid ${soon ? AMBER : accent}`,
        opacity: muted ? 0.7 : 1,
      }}
      title={`${timeSpan(item.appointmentDateTime, duration)} · ${item.patientName}`}
    >
      <div className="flex min-w-0 items-center gap-1">
        <span
          className="shrink-0 text-[11px] font-semibold tabular-nums @max-[140px]:hidden"
          style={{ color: "var(--mp-ink)" }}
        >
          {clockOf(item.appointmentDateTime)}
        </span>
        <span className="min-w-0 overflow-hidden">
          <Party item={item} scope={scope} />
        </span>
        <AllergyFlag
          count={showAllergy ? item.patientAllergyCount : undefined}
          severity={item.patientHighestAllergySeverity}
        />
        {soon && (
          <span
            className="ml-auto inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold"
            style={{ color: AMBER }}
          >
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full motion-safe:animate-pulse"
              style={{ background: AMBER }}
            />
            Starting soon
          </span>
        )}
      </div>
      <div className="min-w-0">
        <AppointmentStatusChip {...view} />
      </div>
      {tall && (
        <span
          className="block truncate text-[11px] leading-tight"
          style={{ color: "var(--mp-muted)" }}
        >
          {item.reasonForVisit || "No reason given"}
        </span>
      )}
    </div>
  );
}

export function AppointmentCard({
  view,
  duration,
  showProvider,
  accent,
}: {
  view: AppointmentViewProps;
  duration: number;
  showProvider: boolean;
  accent: string;
}) {
  const { item, scope, now, showAllergy } = view;
  const soon = isSoon(item, now);
  return (
    <article
      className="flex flex-col gap-2 rounded-xl bg-[var(--mp-surface)] p-3"
      style={{
        border: "1px solid var(--mp-paper-deep)",
        borderLeft: `4px solid ${soon ? AMBER : accent}`,
        opacity: isMuted(item.status) ? 0.75 : 1,
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className="text-sm font-semibold tabular-nums"
          style={{ color: "var(--mp-ink)" }}
        >
          {timeSpan(item.appointmentDateTime, duration)}
        </span>
        <span
          className="text-xs"
          style={{ color: soon ? AMBER : "var(--mp-muted)" }}
        >
          {soon ? "Starting soon · " : ""}
          <RelativeTime iso={item.appointmentDateTime} />
        </span>
      </div>
      <div>
        <AppointmentStatusChip {...view} />
      </div>
      <Flex align="center" gap="2" wrap="wrap" className="min-w-0">
        <Party item={item} scope={scope} />
        {showProvider && scope.mode !== "patient" && (
          <DoctorChip
            variant="inline"
            provider={{
              id: item.providerId,
              ...splitName(item.providerName),
              specialty: item.providerSpecialty,
              clinicId: item.clinicId,
              clinicName: item.clinicName,
            }}
          />
        )}
        <AllergyFlag
          count={showAllergy ? item.patientAllergyCount : undefined}
          severity={item.patientHighestAllergySeverity}
        />
      </Flex>
      {item.reasonForVisit && (
        <Text size="2" style={{ color: "var(--mp-muted)" }}>
          {item.reasonForVisit}
        </Text>
      )}
    </article>
  );
}

const PILL_COLORS: Record<string, { background: string; color: string }> = {
  amber: { background: "var(--mp-amber-bg)", color: "var(--mp-amber-ink)" },
  teal: { background: "var(--mp-teal-bg)", color: "var(--mp-teal-ink)" },
  red: { background: "var(--mp-red-bg)", color: "var(--mp-red-ink)" },
  slate: { background: "var(--mp-slate-bg)", color: "var(--mp-slate-ink)" },
  blue: { background: "var(--mp-blue-bg)", color: "var(--mp-blue-ink)" },
};

export const pillColorsFor = (status: string) =>
  PILL_COLORS[statusPresentation("appointment", status).tone];
