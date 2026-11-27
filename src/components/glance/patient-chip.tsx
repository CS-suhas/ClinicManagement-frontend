"use client";

import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Flex, Text } from "@radix-ui/themes";
import { Chip } from "@/components/ui/chip";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { RelativeTime } from "@/components/ui/relative-time";
import {
  SeverityDot,
  severityLevel,
  severityRank,
  severityWord,
} from "@/components/ui/severity";
import { StatusDot } from "@/components/ui/status-dot";
import { useAuth } from "@/features/auth/auth-provider";
import { useNow } from "@/hooks/use-now";
import { ageInYears } from "@/lib/age";
import type { Schemas } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { formatDayOnly } from "@/lib/relative-time";
import { usePatientGlance } from "./api";
import {
  GlanceAction,
  GlanceError,
  GlanceFooter,
  GlanceHeader,
  GlancePopover,
  GlanceSection,
  GlanceSkeleton,
} from "./glance-popover";
import { statusPresentation } from "./status-chip";
import { fullName } from "./utils";

export type PatientChipProps = {
  patient:
    | {
        id: string;
        firstName: string;
        lastName: string;
        highestSeverity?: string | null;
      }
    | { id: string; name: string; highestSeverity?: string | null };
  seed?: {
    patient: {
      id: string;
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      email: string;
      phoneNumber: string;
    };
    lastVisit: { appointmentDateTime: string } | null;
    nextVisit: { appointmentDateTime: string } | null;
  };
  highestSeverity?: string | null;
  showAllergyFlag?: boolean;
  variant?: "chip" | "inline";
};

function nameOf(patient: PatientChipProps["patient"]): string {
  return "name" in patient ? patient.name : fullName(patient);
}

export function PatientChip({
  patient,
  seed,
  highestSeverity,
  showAllergyFlag = true,
  variant = "chip",
}: PatientChipProps) {
  const name = nameOf(patient);
  const severe =
    showAllergyFlag &&
    severityLevel(highestSeverity ?? patient.highestSeverity) === "SEVERE";
  return (
    <GlancePopover
      label={`Patient ${name}, show details`}
      trigger={
        <Chip
          variant={variant}
          leading={
            <span className="relative inline-flex shrink-0">
              <PersonAvatar name={name} size={18} />
              {severe && <SevereMark />}
            </span>
          }
        >
          {name}
        </Chip>
      }
    >
      {({ open }) => (
        <PatientCard
          patientId={patient.id}
          name={name}
          seed={seed}
          open={open}
        />
      )}
    </GlancePopover>
  );
}

export function SevereMark() {
  return (
    <span
      className="absolute -right-1 -top-1 inline-flex rounded-full bg-[var(--mp-surface)]"
      title="Severe allergy"
    >
      <ExclamationTriangleIcon
        aria-hidden="true"
        width={11}
        height={11}
        style={{ color: "var(--mp-danger)" }}
      />
      <span className="sr-only">Severe allergy</span>
    </span>
  );
}

function VisitLine({
  label,
  visit,
  emptyText,
}: {
  label: string;
  visit: { appointmentDateTime: string } | null;
  emptyText: string;
}) {
  return (
    <div className="min-w-0">
      <Text as="p" size="1" style={{ color: "var(--mp-muted)" }}>
        {label}
      </Text>
      <Text as="p" size="2" weight="medium" style={{ color: "var(--mp-ink)" }}>
        {visit ? <RelativeTime iso={visit.appointmentDateTime} /> : emptyText}
      </Text>
    </div>
  );
}

function PatientCard({
  patientId,
  name,
  seed,
  open,
}: {
  patientId: string;
  name: string;
  seed?: PatientChipProps["seed"];
  open: boolean;
}) {
  const { user } = useAuth();
  const now = useNow();
  const summaryState = usePatientGlance(patientId, open);
  const summary = summaryState.data;
  const record = summary?.patient ?? seed?.patient ?? null;
  const displayName = record ? fullName(record) : name;
  const age =
    now !== null && record ? ageInYears(record.dateOfBirth, now) : null;
  const allergies: Schemas["PatientSummaryAllergy"][] | null | undefined =
    summary ? summary.allergies : undefined;
  const lastVisit = summary ? summary.lastVisit : (seed?.lastVisit ?? null);
  const nextVisit = summary ? summary.nextVisit : (seed?.nextVisit ?? null);
  const counts = summary?.counts ?? null;
  const canBook =
    !!user &&
    (user.roles.includes("admin") || user.roles.includes("clinicadmin"));
  const phone = record?.phoneNumber ?? "";
  const email = record?.email ?? "";
  const topAllergies = allergies
    ? [...allergies].sort(
        (a, b) => severityRank(b.severity) - severityRank(a.severity),
      )
    : [];

  return (
    <>
      <GlanceHeader
        avatar={<PersonAvatar name={displayName} size={44} />}
        title={displayName}
        subtitle={age !== null ? `${age} Y` : undefined}
      />

      {allergies !== null && (
        <GlanceSection title="Allergies">
          {summaryState.isLoading && !summary ? (
            <GlanceSkeleton rows={1} />
          ) : topAllergies.length === 0 ? (
            <Text size="2" style={{ color: "var(--mp-muted)" }}>
              No known allergies
            </Text>
          ) : (
            <Flex gap="2" wrap="wrap">
              {topAllergies.slice(0, 3).map((allergy) => (
                <Chip
                  key={allergy.allergyId}
                  variant="inline"
                  leading={<SeverityDot severity={allergy.severity} />}
                >
                  {allergy.name}
                </Chip>
              ))}
              {topAllergies.length > 3 && (
                <Text size="1" style={{ color: "var(--mp-muted)" }}>
                  +{topAllergies.length - 3} more
                </Text>
              )}
            </Flex>
          )}
          {topAllergies[0] &&
            severityLevel(topAllergies[0].severity) === "SEVERE" && (
              <Text
                size="1"
                className="mt-1 block"
                style={{ color: "var(--mp-red-ink)" }}
              >
                Highest: {severityWord(topAllergies[0].severity)}
              </Text>
            )}
        </GlanceSection>
      )}

      <GlanceSection>
        <div className="grid grid-cols-2 gap-3">
          <VisitLine
            label="Last visit"
            visit={lastVisit}
            emptyText="None yet"
          />
          <VisitLine
            label="Next visit"
            visit={nextVisit}
            emptyText="Not scheduled"
          />
        </div>
      </GlanceSection>

      {counts && (
        <GlanceSection>
          <Text size="2" style={{ color: "var(--mp-ink)" }}>
            Completed {counts.completed} · Upcoming{" "}
            {counts.requested + counts.confirmed} · Cancelled {counts.cancelled}
          </Text>
        </GlanceSection>
      )}

      {summaryState.isError && !summary && (
        <GlanceSection>
          <GlanceError
            message={getErrorMessage(summaryState.error)}
            onRetry={() => void summaryState.refetch()}
          />
        </GlanceSection>
      )}

      {summary?.recent && summary.recent.length > 0 && (
        <GlanceSection title="Recent visits">
          <ul className="flex flex-col gap-1.5">
            {summary.recent.map((visit) => {
              const presentation = statusPresentation(
                "appointment",
                visit.status,
              );
              return (
                <li
                  key={visit.id}
                  className="flex min-w-0 items-center gap-2 text-[13px]"
                >
                  <span
                    className="shrink-0"
                    style={{ color: "var(--mp-muted)" }}
                  >
                    {formatDayOnly(visit.appointmentDateTime)}
                  </span>
                  <span
                    className="min-w-0 truncate"
                    style={{ color: "var(--mp-ink)" }}
                  >
                    {visit.providerName}
                  </span>
                  <span className="ml-auto inline-flex shrink-0 items-center gap-1.5">
                    <StatusDot
                      tone={presentation.tone}
                      label={presentation.label}
                    />
                    <span
                      aria-hidden="true"
                      style={{ color: "var(--mp-muted)" }}
                    >
                      {presentation.label}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </GlanceSection>
      )}

      <GlanceFooter>
        <GlanceAction
          href={phone ? `tel:${phone}` : null}
          primary
          disabledReason="No phone on file"
        >
          Call
        </GlanceAction>
        <GlanceAction
          href={email ? `mailto:${email}` : null}
          disabledReason="No email on file"
        >
          Email
        </GlanceAction>
        <GlanceAction href={`/patients/${patientId}`}>
          View patient
        </GlanceAction>
        {canBook && (
          <GlanceAction href={`/appointments?book=1&patientId=${patientId}`}>
            Book visit
          </GlanceAction>
        )}
      </GlanceFooter>
    </>
  );
}
