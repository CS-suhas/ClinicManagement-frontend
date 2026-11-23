"use client";

import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Flex, Text } from "@radix-ui/themes";
import { useService } from "@/di/container-provider";
import { type Patient, patientFullName } from "@/domain/entities";
import type { PatientRosterRow } from "@/domain/repositories";
import type {
  AllergyEntry,
  PatientSummary,
} from "@/domain/repositories/glance";
import { useAuth } from "@/presentation/auth/auth-provider";
import { useGlanceData } from "../../hooks/use-glance-data";
import { useNow } from "../../hooks/use-now";
import { ageInYears } from "../../lib/age";
import { formatDayOnly } from "../../lib/relative-time";
import { Chip } from "../ui/chip";
import { PersonAvatar } from "../ui/person-avatar";
import { RelativeTime } from "../ui/relative-time";
import {
  SeverityDot,
  severityLevel,
  severityRank,
  severityWord,
} from "../ui/severity";
import { StatusDot } from "../ui/status-dot";
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

export interface PatientChipProps {
  /**
   * Either the full record or just an id and display name. A list item's
   * `highestSeverity` is used for the avatar flag unless `highestSeverity` is passed.
   */
  patient:
    | {
        id: string;
        firstName: string;
        lastName: string;
        highestSeverity?: string | null;
      }
    | { id: string; name: string; highestSeverity?: string | null };
  /**
   * A roster row (or any object with the same patient and visit fields). Its
   * visit facts and contact details paint the card before the summary loads.
   */
  seed?: Pick<PatientRosterRow, "patient" | "lastVisit" | "nextVisit">;
  /**
   * Highest allergy severity to flag on the avatar. Pass it when a list already
   * knows it; the card loads allergies itself either way.
   */
  highestSeverity?: string | null;
  /** Set false to hide the severity flag on the avatar. Defaults to true. */
  showAllergyFlag?: boolean;
  variant?: "chip" | "inline";
}

function nameOf(patient: PatientChipProps["patient"]): string {
  return "name" in patient
    ? patient.name
    : patientFullName(patient as Pick<Patient, "firstName" | "lastName">);
}

/**
 * A patient as an avatar and name. Click, tap or Enter opens a card with
 * allergies, last and next visits, visit counts, recent visits and contact
 * actions. Clicks never reach an enclosing row.
 */
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

/** Red warning triangle on the avatar corner for a SEVERE allergy. */
export function SevereMark() {
  return (
    <span
      className="absolute -right-1 -top-1 inline-flex rounded-full bg-white"
      title="Severe allergy"
    >
      <ExclamationTriangleIcon
        aria-hidden="true"
        width={11}
        height={11}
        style={{ color: "#c53030" }}
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
  const glance = useService("glanceService");
  const { user } = useAuth();
  const now = useNow();
  const summaryState = useGlanceData<PatientSummary>(
    `patient:${patientId}`,
    () => glance.getPatientSummary(patientId),
    open,
  );
  const summary = summaryState.data;
  const record = summary?.patient ?? seed?.patient ?? null;
  const displayName = record ? patientFullName(record) : name;
  const age =
    now !== null && record ? ageInYears(record.dateOfBirth, now) : null;
  const allergies: AllergyEntry[] | null | undefined = summary
    ? summary.allergies
    : undefined;
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
          {summaryState.loading && !summary ? (
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
                style={{ color: "#9b1c1c" }}
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

      {summaryState.error && !summary && (
        <GlanceSection>
          <GlanceError
            message={summaryState.error}
            onRetry={summaryState.retry}
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
