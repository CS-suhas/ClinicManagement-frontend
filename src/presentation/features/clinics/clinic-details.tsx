"use client";

import { Flex, Text } from "@radix-ui/themes";
import { useService } from "@/di/container-provider";
import type { Clinic } from "@/domain/entities";
import type { ClinicSummary } from "@/domain/repositories/glance";
import { DoctorChip } from "@/presentation/components/glance/doctor-chip";
import {
  GlanceError,
  GlanceSkeleton,
} from "@/presentation/components/glance/glance-popover";
import { useGlanceData } from "@/presentation/hooks/use-glance-data";

/** Expanded row of a clinic: the doctors who practise there and the specialties. */
export function ClinicDetails({ clinic }: { clinic: Clinic }) {
  const glance = useService("glanceService");
  const summary = useGlanceData<ClinicSummary>(`clinic:${clinic.id}`, () =>
    glance.getClinicSummary(clinic.id),
  );

  if (summary.error)
    return <GlanceError message={summary.error} onRetry={summary.retry} />;
  if (!summary.data) return <GlanceSkeleton rows={2} />;
  const data = summary.data;
  return (
    <Flex direction="column" gap="3">
      <Text size="2" style={{ color: "var(--mp-muted)" }}>
        {data.providerCount === 0
          ? "No verified doctors here yet."
          : `${data.providerCount} verified ${data.providerCount === 1 ? "doctor" : "doctors"}`}
      </Text>
      {data.providers.length > 0 && (
        <Flex gap="2" wrap="wrap">
          {data.providers.map((p) => (
            <DoctorChip
              key={p.id}
              provider={{
                id: p.id,
                firstName: p.firstName,
                lastName: p.lastName,
                specialty: p.specialty,
                clinicId: clinic.id,
                clinicName: clinic.name,
              }}
              showSpecialty
              variant="inline"
            />
          ))}
        </Flex>
      )}
      {data.topSpecialties.length > 0 && (
        <Text size="2" style={{ color: "var(--mp-ink)" }}>
          Specialties: {data.topSpecialties.join(", ")}
        </Text>
      )}
    </Flex>
  );
}
