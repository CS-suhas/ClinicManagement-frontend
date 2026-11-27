"use client";

import { EnvelopeClosedIcon, MobileIcon } from "@radix-ui/react-icons";
import { Button, Flex, Text } from "@radix-ui/themes";
import Link from "next/link";
import {
  GlanceError,
  GlanceSkeleton,
} from "@/components/glance/glance-popover";
import { StatusPill } from "@/components/glance/status-chip";
import { Chip } from "@/components/ui/chip";
import { SeverityDot } from "@/components/ui/severity";
import { useService } from "@/di/container-provider";
import type {
  AllergyEntry,
  PatientSummary,
} from "@/domain/repositories/glance";
import { useGlanceData } from "@/hooks/use-glance-data";
import { formatDateTime } from "@/lib/format";
import { ContactButton } from "./contact-button";

/**
 * Expanded row of a patient: allergies, the last three visits, contact buttons
 * and a link to the full record. Loads its summary only while open.
 */
export function PatientExpansion({
  patientId,
  name,
  phone,
  email,
}: {
  patientId: string;
  name: string;
  phone: string;
  email: string;
}) {
  const glance = useService("glanceService");
  const summary = useGlanceData<PatientSummary>(`patient:${patientId}`, () =>
    glance.getPatientSummary(patientId),
  );
  const allergies: AllergyEntry[] | null | undefined = summary.data?.allergies;
  const list = allergies ?? null;

  return (
    <Flex direction="column" gap="4">
      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <Heading>Allergies</Heading>
          {!summary.data && !summary.error ? (
            <GlanceSkeleton rows={1} />
          ) : !summary.data ? (
            <GlanceError
              message={summary.error ?? ""}
              onRetry={summary.retry}
            />
          ) : list === null ? (
            <Text size="2" style={{ color: "var(--mp-muted)" }}>
              Not visible to your role.
            </Text>
          ) : list.length === 0 ? (
            <Text size="2" style={{ color: "var(--mp-muted)" }}>
              No known allergies
            </Text>
          ) : (
            <Flex gap="2" wrap="wrap">
              {list.map((allergy) => (
                <Chip
                  key={allergy.allergyId}
                  variant="inline"
                  leading={<SeverityDot severity={allergy.severity} />}
                >
                  {allergy.name}
                </Chip>
              ))}
            </Flex>
          )}
        </section>

        <section>
          <Heading>Last visits</Heading>
          {summary.error && (
            <GlanceError message={summary.error} onRetry={summary.retry} />
          )}
          {!summary.error && summary.loading && !summary.data && (
            <GlanceSkeleton rows={3} />
          )}
          {summary.data?.recent && summary.data.recent.length === 0 && (
            <Text size="2" style={{ color: "var(--mp-muted)" }}>
              No visits yet.
            </Text>
          )}
          {summary.data?.recent && summary.data.recent.length > 0 && (
            <ul className="flex flex-col gap-2">
              {summary.data.recent.map((visit) => (
                <li
                  key={visit.id}
                  className="flex flex-wrap items-center gap-2 text-[13px]"
                >
                  <span style={{ color: "var(--mp-ink)" }}>
                    {formatDateTime(visit.appointmentDateTime)}
                  </span>
                  <span style={{ color: "var(--mp-muted)" }}>
                    {visit.providerName}
                  </span>
                  <StatusPill kind="appointment" status={visit.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Flex gap="2" wrap="wrap" align="center">
        <ContactButton
          href={phone ? `tel:${phone}` : null}
          label={`Call ${name}`}
          icon={<MobileIcon />}
          solid
        />
        <ContactButton
          href={email ? `mailto:${email}` : null}
          label={`Email ${name}`}
          icon={<EnvelopeClosedIcon />}
        />
        <Button size="2" variant="soft" color="teal" asChild>
          <Link href={`/patients/${patientId}`}>Open patient</Link>
        </Button>
      </Flex>
    </Flex>
  );
}

function Heading({ children }: { children: string }) {
  return (
    <h3
      className="mb-2 text-[12px] font-semibold uppercase tracking-wide"
      style={{ color: "var(--mp-muted)" }}
    >
      {children}
    </h3>
  );
}
