"use client";

import { Flex, Text } from "@radix-ui/themes";
import {
  GlanceError,
  GlanceSkeleton,
} from "@/components/glance/glance-popover";
import { PatientChip } from "@/components/glance/patient-chip";
import { getErrorMessage } from "@/lib/errors";
import { useAllergyPatients } from "../api";
import type { AllergyType } from "../schemas";

export function AllergyUsagePanel({ allergy }: { allergy: AllergyType }) {
  const {
    data: patients,
    error,
    isPending,
    refetch,
    allowed,
  } = useAllergyPatients(allergy.id);

  if (!allowed)
    return (
      <Text size="2" style={{ color: "var(--mp-muted)" }}>
        Usage is not available to your role.
      </Text>
    );
  if (error)
    return <GlanceError message={getErrorMessage(error)} onRetry={refetch} />;
  if (isPending) return <GlanceSkeleton rows={2} />;

  return (
    <Flex direction="column" gap="3">
      <Text size="2" style={{ color: "var(--mp-ink)" }}>
        Recorded for {patients.length}{" "}
        {patients.length === 1 ? "patient" : "patients"}
      </Text>
      {patients.length > 0 && (
        <Flex gap="2" wrap="wrap">
          {patients.slice(0, 10).map((patient) => (
            <PatientChip
              key={patient.id}
              patient={{
                id: patient.id,
                name: `${patient.firstName} ${patient.lastName}`,
              }}
            />
          ))}
        </Flex>
      )}
    </Flex>
  );
}
