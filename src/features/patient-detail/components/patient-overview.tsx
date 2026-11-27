"use client";

import { Flex, Text } from "@radix-ui/themes";
import { AllergyChip, StatusChip } from "@/components/glance";
import { RelativeTime } from "@/components/ui/relative-time";
import { Surface } from "@/components/ui/surface";
import type { PatientSummary, VisitFact } from "@/domain/repositories/glance";
import { formatDateTime } from "@/lib/format";

export function PatientOverview({ summary }: { summary: PatientSummary }) {
  const counts = summary.counts;
  const tiles: { label: string; value: number | null }[] = [
    { label: "Total visits", value: counts?.total ?? null },
    { label: "Completed", value: counts?.completed ?? null },
    {
      label: "Upcoming",
      value: counts ? counts.requested + counts.confirmed : null,
    },
    { label: "Cancelled", value: counts?.cancelled ?? null },
  ];

  return (
    <div className="flex flex-col gap-5">
      <dl className="m-0 grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((tile) => (
          <Surface key={tile.label} padding="md">
            <dt
              className="text-xs font-medium"
              style={{ color: "var(--mp-muted)" }}
            >
              {tile.label}
            </dt>
            <dd
              className="m-0 mt-1 text-2xl font-semibold tabular-nums"
              style={{ color: "var(--mp-ink)" }}
            >
              {tile.value ?? "—"}
            </dd>
          </Surface>
        ))}
      </dl>

      <Surface padding="lg">
        <Text
          as="p"
          size="2"
          weight="bold"
          mb="2"
          style={{ color: "var(--mp-ink)" }}
        >
          Next visit
        </Text>
        {summary.nextVisit ? (
          <VisitRow visit={summary.nextVisit} showRelative />
        ) : (
          <Text as="p" size="2" style={{ color: "var(--mp-muted)" }}>
            {summary.counts === null
              ? "Visit details are not visible to you."
              : "No upcoming visits."}
          </Text>
        )}
      </Surface>

      <Surface padding="lg">
        <Text
          as="p"
          size="2"
          weight="bold"
          mb="2"
          style={{ color: "var(--mp-ink)" }}
        >
          Allergies
        </Text>
        {summary.allergies === null ? (
          <Text as="p" size="2" style={{ color: "var(--mp-muted)" }}>
            Allergy details are not visible to you.
          </Text>
        ) : summary.allergies.length === 0 ? (
          <Text as="p" size="2" style={{ color: "var(--mp-muted)" }}>
            No known allergies.
          </Text>
        ) : (
          <Flex gap="2" wrap="wrap">
            {summary.allergies.map((allergy) => (
              <AllergyChip
                key={allergy.allergyId}
                name={allergy.name}
                severity={allergy.severity}
                allergyId={allergy.allergyId}
                variant="inline"
              />
            ))}
          </Flex>
        )}
      </Surface>

      <Surface padding="lg">
        <Text
          as="p"
          size="2"
          weight="bold"
          mb="2"
          style={{ color: "var(--mp-ink)" }}
        >
          Latest visits
        </Text>
        {summary.recent === null ? (
          <Text as="p" size="2" style={{ color: "var(--mp-muted)" }}>
            Visit details are not visible to you.
          </Text>
        ) : summary.recent.length === 0 ? (
          <Text as="p" size="2" style={{ color: "var(--mp-muted)" }}>
            No visits yet.
          </Text>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {summary.recent.map((visit) => (
              <li key={visit.id}>
                <VisitRow visit={visit} />
              </li>
            ))}
          </ul>
        )}
      </Surface>
    </div>
  );
}

export function VisitRow({
  visit,
  showRelative = false,
}: {
  visit: VisitFact;
  showRelative?: boolean;
}) {
  return (
    <Flex gap="3" align="center" wrap="wrap">
      <Text size="2" style={{ color: "var(--mp-ink)" }}>
        {showRelative ? (
          <RelativeTime iso={visit.appointmentDateTime} />
        ) : (
          formatDateTime(visit.appointmentDateTime)
        )}
      </Text>
      <Text size="2" style={{ color: "var(--mp-muted)" }}>
        {visit.providerName}
      </Text>
      <StatusChip
        kind="appointment"
        status={visit.status}
        interactive={false}
      />
    </Flex>
  );
}
