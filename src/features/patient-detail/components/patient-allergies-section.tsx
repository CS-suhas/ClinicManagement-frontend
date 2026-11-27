"use client";

import { Button, Flex, Text } from "@radix-ui/themes";
import { AllergyChip } from "@/components/glance";
import { Surface } from "@/components/ui/surface";
import type { PatientSummaryAllergy } from "@/features/patients/schemas";

export function PatientAllergiesSection({
  allergies,
  readOnly,
  onOpen,
}: {
  allergies: PatientSummaryAllergy[] | null;
  readOnly: boolean;
  onOpen: () => void;
}) {
  return (
    <Surface padding="lg">
      <Flex justify="between" align="center" gap="3" wrap="wrap" mb="3">
        <Text size="2" weight="bold" style={{ color: "var(--mp-ink)" }}>
          Recorded allergies
        </Text>
        {allergies !== null && (
          <Button variant="soft" color="teal" onClick={onOpen}>
            {readOnly ? "View allergy record" : "Manage allergies"}
          </Button>
        )}
      </Flex>

      {allergies === null ? (
        <Text as="p" size="2" style={{ color: "var(--mp-muted)" }}>
          Allergy details are not visible to you.
        </Text>
      ) : allergies.length === 0 ? (
        <Text as="p" size="2" style={{ color: "var(--mp-muted)" }}>
          No known allergies.
        </Text>
      ) : (
        <Flex gap="2" wrap="wrap">
          {allergies.map((allergy) => (
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
      {readOnly && allergies !== null && (
        <Text as="p" size="1" mt="3" style={{ color: "var(--mp-muted)" }}>
          You can see this record but not change it.
        </Text>
      )}
    </Surface>
  );
}
