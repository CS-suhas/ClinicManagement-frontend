"use client";

import { EnvelopeClosedIcon, MobileIcon } from "@radix-ui/react-icons";
import { Button, Flex, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";
import type { RosterProvider } from "@/application/services/patient-service";
import { type Column, DataTable } from "@/components/data-table";
import {
  GlanceError,
  GlanceHeader,
  GlancePopover,
  GlanceSection,
  GlanceSkeleton,
} from "@/components/glance/glance-popover";
import { PatientChip } from "@/components/glance/patient-chip";
import { Chip } from "@/components/ui/chip";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { RelativeTime } from "@/components/ui/relative-time";
import { SeverityDot, severityRank } from "@/components/ui/severity";
import { useService } from "@/di/container-provider";
import { type PatientListItem, patientFullName } from "@/domain/entities";
import type { PatientVisitSummary } from "@/domain/repositories";
import type { PatientSummary } from "@/domain/repositories/glance";
import { useGlanceData } from "@/hooks/use-glance-data";
import { useNow } from "@/hooks/use-now";
import { ageInYears } from "@/lib/age";
import { formatDayOnly } from "@/lib/relative-time";
import { ContactButton } from "./contact-button";
import { PatientExpansion } from "./patient-expansion";
import { downloadText, mailtoBcc, rosterToCsv } from "./patient-roster-export";
import { EMPTY_CELL, formatTime } from "./patient-roster-format";

const muted = { color: "var(--mp-muted)" } as const;

/**
 * A roster line as the table reads it. The doctor's roster has the last and
 * next visits; the admin page also passes the latest visit and provider.
 */
export type PatientTableRow = {
  patient: PatientListItem;
  lastVisit?: PatientVisitSummary | null;
  nextVisit?: PatientVisitSummary | null;
  latestVisit?: { reasonForVisit: string | null } | null;
  provider?: RosterProvider;
};

/** The allergy list for the card, loaded only when the card opens. */
function AllergyCard({ patientId, name }: { patientId: string; name: string }) {
  const glance = useService("glanceService");
  const summary = useGlanceData<PatientSummary>(`patient:${patientId}`, () =>
    glance.getPatientSummary(patientId),
  );
  const allergies = summary.data?.allergies;
  return (
    <>
      <GlanceHeader
        avatar={<PersonAvatar name={name} size={44} />}
        title={`Allergies: ${name}`}
      />
      <GlanceSection>
        {summary.error && !summary.data ? (
          <GlanceError message={summary.error} onRetry={summary.retry} />
        ) : !summary.data ? (
          <GlanceSkeleton rows={2} />
        ) : allergies === null ? (
          <Text size="2" style={muted}>
            Not visible to your role.
          </Text>
        ) : (
          <Flex gap="2" wrap="wrap">
            {[...(allergies ?? [])]
              .sort(
                (a, b) => severityRank(b.severity) - severityRank(a.severity),
              )
              .map((entry) => (
                <Chip
                  key={entry.allergyId}
                  variant="inline"
                  leading={<SeverityDot severity={entry.severity} />}
                >
                  {entry.name}
                </Chip>
              ))}
          </Flex>
        )}
      </GlanceSection>
    </>
  );
}

/**
 * Allergy count with the highest severity as a dot. The count comes from the
 * patient record; the full list loads when the card opens.
 */
function AllergiesCell({ patient }: { patient: PatientListItem }) {
  const name = patientFullName(patient);
  const count = patient.allergyCount;
  if (count === undefined)
    return (
      <Text size="2" style={muted}>
        {EMPTY_CELL}
      </Text>
    );
  if (count === 0)
    return (
      <Text size="2" style={muted}>
        None
      </Text>
    );
  return (
    <GlancePopover
      label={`Allergies for ${name}, show details`}
      width={280}
      trigger={
        <span className="inline-flex items-center gap-1.5">
          <SeverityDot severity={patient.highestSeverity} />
          <span className="text-[13px]" style={{ color: "var(--mp-ink)" }}>
            {count} {count === 1 ? "allergy" : "allergies"}
          </span>
        </span>
      }
    >
      {() => <AllergyCard patientId={patient.id} name={name} />}
    </GlancePopover>
  );
}

function VisitCell({
  visit,
  style,
}: {
  visit: PatientVisitSummary | null | undefined;
  style: "next" | "last";
}) {
  if (!visit)
    return (
      <Text size="2" style={muted}>
        {EMPTY_CELL}
      </Text>
    );
  if (style === "next")
    return (
      <span
        className="inline-flex rounded-full px-2 py-0.5 text-[12px] font-semibold"
        style={{
          background: "var(--mp-primary-tint)",
          color: "var(--mp-primary-dark)",
        }}
      >
        <RelativeTime iso={visit.appointmentDateTime} />
      </span>
    );
  return (
    <Flex direction="column">
      <Text size="2" style={{ color: "var(--mp-ink)" }}>
        <RelativeTime iso={visit.appointmentDateTime} style="long" />
      </Text>
      <Text size="1" style={muted}>
        {formatDayOnly(visit.appointmentDateTime)}{" "}
        {formatTime(visit.appointmentDateTime)}
      </Text>
    </Flex>
  );
}

/**
 * Patient roster on the shared DataTable: chips with glance cards, allergy
 * counts and severities (sortable), visit times, contact buttons, an optional
 * row menu (admin), an expansion with allergies and recent visits, and bulk
 * export and email for the selected rows.
 */
export function PatientRosterTable({
  rows,
  showProvider = false,
  rowMenu,
  selectable = true,
}: {
  rows: PatientTableRow[];
  /** Adds the assigned-provider column (admin view). */
  showProvider?: boolean;
  /** The ⋮ menu for a row. Omit for read-only views. */
  rowMenu?: (row: PatientTableRow) => ReactNode;
  /** Adds checkboxes with Export CSV and Email actions for the selection. */
  selectable?: boolean;
}) {
  const now = useNow();

  const columns: Column<PatientTableRow>[] = [
    {
      id: "patient",
      header: "Patient",
      sortValue: (row) => patientFullName(row.patient),
      cell: (row) => {
        const age =
          now === null ? null : ageInYears(row.patient.dateOfBirth, now);
        return (
          <Flex direction="column" align="start" gap="1" minWidth="0">
            <PatientChip
              patient={row.patient}
              seed={{
                patient: row.patient,
                lastVisit: row.lastVisit ?? null,
                nextVisit: row.nextVisit ?? null,
              }}
            />
            {age !== null && (
              <Text size="1" className="pl-1" style={muted}>
                {age} Y
              </Text>
            )}
          </Flex>
        );
      },
    },
    {
      id: "allergies",
      header: "Allergies",
      hideBelow: "md",
      sortValue: (row) =>
        row.patient.allergyCount === undefined
          ? null
          : row.patient.allergyCount === 0
            ? 0
            : severityRank(row.patient.highestSeverity),
      cell: (row) => <AllergiesCell patient={row.patient} />,
    },
    ...(showProvider
      ? [
          {
            id: "provider",
            header: "Provider",
            hideBelow: "md" as const,
            cell: (row: PatientTableRow) =>
              row.provider ? (
                <Flex direction="column">
                  <Text
                    size="2"
                    weight="bold"
                    style={{ color: "var(--mp-ink)" }}
                  >
                    {row.provider.name}
                  </Text>
                  <Text size="1" style={muted}>
                    {row.provider.specialty}
                  </Text>
                </Flex>
              ) : (
                <Text size="2" style={muted}>
                  {EMPTY_CELL}
                </Text>
              ),
          },
        ]
      : []),
    {
      id: "last",
      header: "Last visit",
      sortValue: (row) =>
        row.lastVisit ? Date.parse(row.lastVisit.appointmentDateTime) : null,
      cell: (row) => <VisitCell visit={row.lastVisit} style="last" />,
    },
    {
      id: "next",
      header: "Next visit",
      sortValue: (row) =>
        row.nextVisit ? Date.parse(row.nextVisit.appointmentDateTime) : null,
      cell: (row) => <VisitCell visit={row.nextVisit} style="next" />,
    },
    {
      id: "reason",
      header: "Reason",
      hideBelow: "md",
      cell: (row) => {
        const reason =
          row.latestVisit?.reasonForVisit ??
          row.nextVisit?.reasonForVisit ??
          row.lastVisit?.reasonForVisit;
        return (
          <Text
            size="2"
            className="block max-w-[16rem] truncate"
            title={reason ?? undefined}
          >
            {reason || EMPTY_CELL}
          </Text>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows.map((row) => ({ ...row, id: row.patient.id }))}
      rowLabel={(row) => patientFullName(row.patient)}
      caption="Patients"
      rowActions={(row) => {
        const name = patientFullName(row.patient);
        return (
          <Flex gap="2" justify="end" align="center">
            <ContactButton
              href={
                row.patient.phoneNumber
                  ? `tel:${row.patient.phoneNumber}`
                  : null
              }
              label={`Call ${name}`}
              icon={<MobileIcon />}
            />
            {rowMenu?.(row)}
          </Flex>
        );
      }}
      expandable={{
        render: (row) => (
          <PatientExpansion
            patientId={row.patient.id}
            name={patientFullName(row.patient)}
            phone={row.patient.phoneNumber}
            email={row.patient.email}
          />
        ),
      }}
      selection={
        selectable
          ? {
              bulkActions: (selected) => {
                const emails = selected
                  .map((r) => r.patient.email)
                  .filter(Boolean);
                return (
                  <Flex gap="2" wrap="wrap">
                    <Button
                      size="1"
                      variant="soft"
                      color="teal"
                      onClick={() =>
                        downloadText(
                          `patients-${new Date().toISOString().slice(0, 10)}.csv`,
                          rosterToCsv(selected),
                        )
                      }
                    >
                      Export CSV
                    </Button>
                    {emails.length > 0 ? (
                      <Button size="1" variant="soft" color="teal" asChild>
                        <a href={mailtoBcc(emails)}>
                          <EnvelopeClosedIcon /> Email selected ({emails.length}
                          )
                        </a>
                      </Button>
                    ) : (
                      <Button size="1" variant="soft" color="gray" disabled>
                        Email selected
                      </Button>
                    )}
                  </Flex>
                );
              },
            }
          : undefined
      }
    />
  );
}
