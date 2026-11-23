"use client";

import { MobileIcon } from "@radix-ui/react-icons";
import { Flex, Table, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";
import type { PatientRosterRow } from "@/application/services/patient-service";
import { patientFullName } from "@/domain/entities";
import { PersonAvatar } from "@/presentation/components/ui/person-avatar";
import { ContactButton } from "./contact-button";
import { PatientHoverCard } from "./patient-hover-card";
import {
  ageInYears,
  EMPTY_CELL,
  formatTime,
  formatVisitDate,
} from "./patient-roster-format";

const muted = { color: "var(--mp-muted)" } as const;

/** Date on one line, time muted underneath; a dash when there is no visit. */
function VisitCell({ iso }: { iso: string | undefined }) {
  if (!iso) return <Text style={muted}>{EMPTY_CELL}</Text>;
  return (
    <Flex direction="column">
      <Text size="2" style={{ color: "var(--mp-ink)" }}>
        {formatVisitDate(iso)}
      </Text>
      <Text size="1" style={muted}>
        {formatTime(iso)}
      </Text>
    </Flex>
  );
}

/** Patient roster rows. Pass `rowMenu` to add the ⋮ menu; omit it for read-only views. */
export function PatientRosterTable({
  rows,
  now,
  rowMenu,
}: {
  rows: PatientRosterRow[];
  /** Epoch ms, or null before mount. */
  now: number | null;
  rowMenu?: (row: PatientRosterRow) => ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <Table.Root
        variant="ghost"
        className="mp-table"
        style={{ minWidth: 960 }}
      >
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Patient name</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Date of birth</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Reason</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Assigned provider</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Last visit</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Next visit</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell justify="end">
              Action
            </Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.map((row) => {
            const { patient } = row;
            const name = patientFullName(patient);
            const age =
              now === null ? null : ageInYears(patient.dateOfBirth, now);
            const reason = row.latestVisit?.reasonForVisit;
            return (
              <Table.Row key={patient.id} align="center">
                <Table.RowHeaderCell>
                  <Flex align="center" gap="3">
                    <PersonAvatar name={name} size={36} />
                    <Flex direction="column" minWidth="0">
                      <PatientHoverCard
                        patient={patient}
                        nextVisit={row.nextVisit}
                        now={now}
                      >
                        <button
                          type="button"
                          className="cursor-pointer truncate rounded text-left font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                          style={{ color: "var(--mp-ink)" }}
                        >
                          {name}
                        </button>
                      </PatientHoverCard>
                      {age !== null && (
                        <Text size="1" style={muted}>
                          {age} Y
                        </Text>
                      )}
                    </Flex>
                  </Flex>
                </Table.RowHeaderCell>
                <Table.Cell>
                  <Text size="2">
                    {formatVisitDate(patient.dateOfBirth) || EMPTY_CELL}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text
                    size="2"
                    className="block max-w-[16rem] truncate"
                    title={reason}
                  >
                    {reason || EMPTY_CELL}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  {row.provider ? (
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
                  )}
                </Table.Cell>
                <Table.Cell>
                  <VisitCell iso={row.lastVisit?.appointmentDateTime} />
                </Table.Cell>
                <Table.Cell>
                  <VisitCell iso={row.nextVisit?.appointmentDateTime} />
                </Table.Cell>
                <Table.Cell justify="end">
                  <Flex gap="2" justify="end" align="center">
                    <ContactButton
                      href={
                        patient.phoneNumber
                          ? `tel:${patient.phoneNumber}`
                          : null
                      }
                      label={`Call ${name}`}
                      icon={<MobileIcon />}
                    />
                    {rowMenu?.(row)}
                  </Flex>
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>
    </div>
  );
}
