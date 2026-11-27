"use client";

import { Text } from "@radix-ui/themes";
import { Chip } from "@/components/ui/chip";
import {
  SEVERITY_MEANING,
  SeverityDot,
  severityLevel,
  severityWord,
} from "@/components/ui/severity";
import { useService } from "@/di/container-provider";
import type { AllergyUsage } from "@/domain/repositories/glance";
import { useGlanceData } from "@/hooks/use-glance-data";
import {
  GlanceAction,
  GlanceError,
  GlanceFooter,
  GlanceHeader,
  GlancePopover,
  GlanceSection,
  GlanceSkeleton,
} from "./glance-popover";

export type AllergyChipProps = {
  name: string;
  severity?: string | null;
  allergyId?: string;
  patientId?: string;
  variant?: "chip" | "inline";
  showDot?: boolean;
};

export function AllergyChip({
  name,
  severity,
  allergyId,
  patientId,
  variant = "chip",
  showDot = true,
}: AllergyChipProps) {
  return (
    <GlancePopover
      label={`Allergy ${name}, ${severityWord(severity)} severity, show details`}
      width={280}
      trigger={
        <Chip
          variant={variant}
          leading={showDot ? <SeverityDot severity={severity} /> : undefined}
        >
          {name}
        </Chip>
      }
    >
      {({ open }) => (
        <AllergyCard
          name={name}
          severity={severity}
          allergyId={allergyId}
          patientId={patientId}
          open={open}
        />
      )}
    </GlancePopover>
  );
}

function AllergyCard({
  name,
  severity,
  allergyId,
  patientId,
  open,
}: {
  name: string;
  severity?: string | null;
  allergyId?: string;
  patientId?: string;
  open: boolean;
}) {
  const glance = useService("glanceService");
  const usage = useGlanceData<AllergyUsage | null>(
    `allergy:${allergyId ?? ""}`,
    () => glance.getAllergyUsage(allergyId ?? ""),
    open && !!allergyId,
  );
  const level = severityLevel(severity);
  return (
    <>
      <GlanceHeader
        avatar={<SeverityDot severity={severity} size={14} />}
        title={name}
        subtitle={`${severityWord(severity)} severity`}
      />
      <GlanceSection>
        <Text size="2" style={{ color: "var(--mp-ink)" }}>
          {SEVERITY_MEANING[level]}
        </Text>
        {allergyId && (
          <div className="mt-2">
            {usage.error ? (
              <GlanceError message={usage.error} onRetry={usage.retry} />
            ) : usage.loading && !usage.data ? (
              <GlanceSkeleton rows={1} />
            ) : usage.data ? (
              <Text size="2" style={{ color: "var(--mp-muted)" }}>
                Recorded for {usage.data.patientCount}{" "}
                {usage.data.patientCount === 1 ? "patient" : "patients"}
              </Text>
            ) : null}
          </div>
        )}
      </GlanceSection>
      {patientId && (
        <GlanceFooter>
          <GlanceAction href={`/patients/${patientId}?tab=allergies`}>
            Change severity
          </GlanceAction>
        </GlanceFooter>
      )}
    </>
  );
}
