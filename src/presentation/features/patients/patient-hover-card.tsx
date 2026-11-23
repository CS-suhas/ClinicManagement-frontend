"use client";

import {
  CalendarIcon,
  EnvelopeClosedIcon,
  MobileIcon,
} from "@radix-ui/react-icons";
import { Flex, HoverCard, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";
import { type Patient, patientFullName } from "@/domain/entities";
import { PersonAvatar } from "@/presentation/components/ui/person-avatar";
import { formatDateTime } from "@/presentation/lib/format";
import { ContactButton } from "./contact-button";
import { ageInYears } from "./patient-roster-format";

/** Quick card shown when a patient's name is hovered or focused. */
export function PatientHoverCard({
  patient,
  nextVisit,
  now,
  children,
}: {
  patient: Patient;
  nextVisit?: { appointmentDateTime: string } | null;
  /** Epoch ms, or null before mount. */
  now: number | null;
  /** The trigger element, rendered as-is. */
  children: ReactNode;
}) {
  const name = patientFullName(patient);
  const age = now === null ? null : ageInYears(patient.dateOfBirth, now);

  return (
    <HoverCard.Root openDelay={150} closeDelay={100}>
      <HoverCard.Trigger>{children}</HoverCard.Trigger>
      <HoverCard.Content size="2" maxWidth="300px" side="bottom" align="start">
        <Flex direction="column" gap="3">
          <Flex align="center" gap="3">
            <PersonAvatar name={name} size={44} />
            <Flex direction="column" minWidth="0">
              <Text weight="bold" size="3" className="truncate">
                {name}
              </Text>
              {age !== null && (
                <Text size="1" style={{ color: "var(--mp-muted)" }}>
                  {age} Y
                </Text>
              )}
            </Flex>
          </Flex>

          <Flex direction="column" gap="1" minWidth="0">
            <Text
              size="2"
              className="truncate"
              style={{ color: "var(--mp-ink)" }}
            >
              {patient.email || "No email on file"}
            </Text>
            <Text size="2" style={{ color: "var(--mp-muted)" }}>
              {patient.phoneNumber || "No phone on file"}
            </Text>
          </Flex>

          <Flex align="center" gap="2">
            <CalendarIcon style={{ color: "var(--mp-primary)" }} />
            <Text size="2" style={{ color: "var(--mp-muted)" }}>
              Next visit:{" "}
              {nextVisit
                ? formatDateTime(nextVisit.appointmentDateTime)
                : "none scheduled"}
            </Text>
          </Flex>

          <Flex gap="2" justify="end">
            <ContactButton
              href={patient.email ? `mailto:${patient.email}` : null}
              label={`Email ${name}`}
              icon={<EnvelopeClosedIcon />}
            />
            <ContactButton
              href={patient.phoneNumber ? `tel:${patient.phoneNumber}` : null}
              label={`Call ${name}`}
              icon={<MobileIcon />}
              solid
            />
          </Flex>
        </Flex>
      </HoverCard.Content>
    </HoverCard.Root>
  );
}
