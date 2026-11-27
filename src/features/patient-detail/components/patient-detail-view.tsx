"use client";

import { Button, Flex, Spinner, Tabs, Text } from "@radix-ui/themes";
import Link from "next/link";
import { useState } from "react";
import { ErrorCallout } from "@/components/error-callout";
import { EmptyState } from "@/components/ui/empty-state";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { Surface } from "@/components/ui/surface";
import { useAuth } from "@/features/auth/auth-provider";
import { hasRole } from "@/features/auth/permissions";
import { usePatientSummary } from "@/features/patients/api";
import { PatientAllergiesDialog } from "@/features/patients/components/patient-allergies-dialog";
import type { Patient } from "@/features/patients/schemas";
import { patientFullName } from "@/features/patients/utils";
import { useNow } from "@/hooks/use-now";
import { ageInYears } from "@/lib/age";
import { getErrorMessage } from "@/lib/errors";
import { usePatientAccess } from "../api";
import { PatientAllergiesSection } from "./patient-allergies-section";
import { PatientAppointments } from "./patient-appointments";
import { PatientOverview } from "./patient-overview";

export type PatientTab = "overview" | "appointments" | "allergies";

const TABS: { value: PatientTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "appointments", label: "Appointments" },
  { value: "allergies", label: "Allergies" },
];

export function PatientDetailView({
  patientId,
  initialTab = "overview",
}: {
  patientId: string;
  initialTab?: PatientTab;
}) {
  const { user } = useAuth();
  const now = useNow();
  const access = usePatientAccess(patientId);
  const allowed = access.state === "allowed";
  const readOnly = access.state === "allowed" && access.readOnly;
  const [tab, setTab] = useState<PatientTab>(initialTab);
  const [allergiesOpen, setAllergiesOpen] = useState(false);
  const summary = usePatientSummary(patientId, allowed);

  if (access.state === "checking")
    return (
      <Flex justify="center" py="9">
        <Spinner size="3" />
      </Flex>
    );

  if (access.state === "denied")
    return (
      <Surface padding="lg" role="alert" style={{ maxWidth: 560 }}>
        <Text as="p" size="3" weight="bold" style={{ color: "var(--mp-ink)" }}>
          You cannot open this record
        </Text>
        <Text
          as="p"
          size="2"
          mt="1"
          mb="3"
          style={{ color: "var(--mp-muted)" }}
        >
          Doctors can open the records of patients they have seen. Ask the
          patient to book with you, or go back to your patient list.
        </Text>
        <Button asChild variant="soft" color="teal">
          <Link href="/patients">Back to patients</Link>
        </Button>
      </Surface>
    );

  if (summary.error)
    return (
      <ErrorCallout
        message={getErrorMessage(summary.error)}
        onRetry={() => void summary.refetch()}
      />
    );

  const data = summary.data;
  if (!data)
    return (
      <Flex justify="center" py="9">
        <Spinner size="3" />
      </Flex>
    );

  const patient: Patient | null = data.patient;
  if (!patient)
    return (
      <EmptyState
        title="Patient not found"
        description="This record may have been removed."
        action={
          <Button asChild variant="soft" color="teal">
            <Link href="/patients">Back to patients</Link>
          </Button>
        }
      />
    );

  const age = now !== null ? ageInYears(patient.dateOfBirth, now) : null;
  const canBook = hasRole(user, "admin");
  const fullName = patientFullName(patient);

  return (
    <div className="flex flex-col gap-5">
      <Surface padding="lg">
        <Flex justify="between" align="start" gap="4" wrap="wrap">
          <Flex gap="4" align="center" className="min-w-0">
            <PersonAvatar name={fullName} size={64} />
            <div className="min-w-0">
              <h1
                className="m-0 text-2xl font-semibold"
                style={{ color: "var(--mp-ink)" }}
              >
                {fullName}
              </h1>
              <Text as="p" size="2" style={{ color: "var(--mp-muted)" }}>
                {age !== null ? `${age} years` : "Age not shown"}
                {patient.dateOfBirth && ` · born ${patient.dateOfBirth}`}
              </Text>
              <Flex gap="3" wrap="wrap" mt="1">
                {patient.phoneNumber && (
                  <Text asChild size="2">
                    <a
                      href={`tel:${patient.phoneNumber}`}
                      style={{ color: "var(--mp-ink)" }}
                    >
                      {patient.phoneNumber}
                    </a>
                  </Text>
                )}
                {patient.email && (
                  <Text asChild size="2">
                    <a
                      href={`mailto:${patient.email}`}
                      style={{ color: "var(--mp-ink)" }}
                    >
                      {patient.email}
                    </a>
                  </Text>
                )}
              </Flex>
            </div>
          </Flex>
          <Flex gap="2" wrap="wrap">
            {canBook && (
              <Button asChild color="teal">
                <Link href={`/appointments?book=1&patientId=${patientId}`}>
                  Book appointment
                </Link>
              </Button>
            )}
          </Flex>
        </Flex>
      </Surface>

      <Tabs.Root
        value={tab}
        onValueChange={(value) => {
          setTab(value as PatientTab);
          window.history.replaceState(null, "", `?tab=${value}`);
        }}
      >
        <Tabs.List aria-label="Patient record sections" className="mb-4">
          {TABS.map((item) => (
            <Tabs.Trigger key={item.value} value={item.value}>
              {item.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="overview">
          <PatientOverview summary={data} />
        </Tabs.Content>
        <Tabs.Content value="appointments">
          <PatientAppointments
            patientId={patientId}
            scopeProviderId={
              hasRole(user, "doctor") && !hasRole(user, "admin")
                ? (user?.provider?.id ?? null)
                : null
            }
          />
        </Tabs.Content>
        <Tabs.Content value="allergies">
          <PatientAllergiesSection
            allergies={data.allergies}
            readOnly={readOnly}
            onOpen={() => setAllergiesOpen(true)}
          />
        </Tabs.Content>
      </Tabs.Root>

      {allergiesOpen && (
        <PatientAllergiesDialog
          open
          onOpenChange={setAllergiesOpen}
          patient={patient}
          readOnly={readOnly}
        />
      )}
    </div>
  );
}
