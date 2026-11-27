"use client";

import { Flex, Text } from "@radix-ui/themes";
import {
  GlanceError,
  GlanceSkeleton,
} from "@/components/glance/glance-popover";
import { PatientChip } from "@/components/glance/patient-chip";
import { useService } from "@/di/container-provider";
import type { AllergyType } from "@/domain/entities";
import type { AllergyUsage } from "@/domain/repositories/glance";
import { useGlanceData } from "@/hooks/use-glance-data";

/** Expanded row of an allergy: who has it recorded. Staff and doctors only. */
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
  return (
    <Flex direction="column" gap="3">
      <Text size="2" style={{ color: "var(--mp-ink)" }}>
        Recorded for {data.patientCount}{" "}
        {data.patientCount === 1 ? "patient" : "patients"}
      </Text>
      {data.patients.length > 0 && (
        <Flex gap="2" wrap="wrap">
          {data.patients.map((patient) => (
            <PatientChip
              key={patient.id}
              patient={{ id: patient.id, name: patient.name }}
            />
          ))}
        </Flex>
      )}
    </Flex>
  );
}
