"use client";

import { Flex, Text } from "@radix-ui/themes";
import { useService } from "@/di/container-provider";
import type { AllergyType } from "@/domain/entities";
import type { AllergyUsage } from "@/domain/repositories/glance";
import {
  GlanceError,
  GlanceSkeleton,
} from "@/presentation/components/glance/glance-popover";
import { PatientChip } from "@/presentation/components/glance/patient-chip";
import { severityWord } from "@/presentation/components/ui/severity";
import { useGlanceData } from "@/presentation/hooks/use-glance-data";

/** Expanded row of an allergy: who has it recorded, and how severe. Staff and doctors only. */
export function AllergyUsagePanel({ allergy }: { allergy: AllergyType }) {
  const glance = useService("glanceService");
  const usage = useGlanceData<AllergyUsage | null>(
    `allergy:${allergy.id}`,
    () => glance.getAllergyUsage(allergy.id),
  );

  if (usage.error)
    return <GlanceError message={usage.error} onRetry={usage.retry} />;
  if (!usage.data) {
    if (usage.loading) return <GlanceSkeleton rows={2} />;
    return (
      <Text size="2" style={{ color: "var(--mp-muted)" }}>
        Usage is not available to your role.
      </Text>
    );
  }
  const data = usage.data;
  const mix = Object.entries(data.severityCounts)
    .map(([severity, count]) => `${severityWord(severity)} ${count}`)
    .join(" · ");
  return (
    <Flex direction="column" gap="3">
      <Text size="2" style={{ color: "var(--mp-ink)" }}>
        Recorded for {data.patientCount}{" "}
        {data.patientCount === 1 ? "patient" : "patients"}
        {mix && <span style={{ color: "var(--mp-muted)" }}> · {mix}</span>}
      </Text>
      {data.patients.length > 0 && (
        <Flex gap="2" wrap="wrap">
          {data.patients.map((patient) =>
            patient.name ? (
              <PatientChip
                key={patient.id}
                patient={{ id: patient.id, name: patient.name }}
              />
            ) : (
              <Text
                key={patient.id}
                size="2"
                style={{ color: "var(--mp-muted)" }}
              >
                Patient record hidden
              </Text>
            ),
          )}
        </Flex>
      )}
    </Flex>
  );
}
