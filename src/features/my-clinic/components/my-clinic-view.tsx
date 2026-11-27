"use client";

import { Button, Flex, Text } from "@radix-ui/themes";
import Link from "next/link";
import { useEffect } from "react";
import { AsyncContent } from "@/components/async-content";
import { ClinicChip } from "@/components/glance";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { useAuth } from "@/features/auth/auth-provider";
import { useMyClinic } from "./use-my-clinic";

/** A doctor's own clinic and its summary. */
export function MyClinicView() {
  const { user, refresh } = useAuth();
  const providerId = user?.provider?.id ?? null;
  const state = useMyClinic(providerId);

  // The session may be stale after an admin changes the clinic; re-read it once.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <>
      <PageHeader
        title="My clinic"
        subtitle="The clinic you practise at. To change it, contact a platform administrator."
      />
      <AsyncContent
        loading={state.provider.loading}
        error={state.provider.error}
        isEmpty={false}
        onRetry={() => void state.provider.reload()}
      >
        {state.clinicId && (
          <CurrentClinic
            clinicId={state.clinicId}
            name={state.summary.data?.clinic?.name ?? "Your clinic"}
            location={state.summary.data?.clinic?.location ?? null}
            phone={state.summary.data?.clinic?.phoneNumber ?? null}
            doctorCount={state.summary.data?.providerCount ?? null}
          />
        )}
      </AsyncContent>
    </>
  );
}

function CurrentClinic({
  clinicId,
  name,
  location,
  phone,
  doctorCount,
}: {
  clinicId: string;
  name: string;
  location: string | null;
  phone: string | null;
  doctorCount: number | null;
}) {
  return (
    <Surface padding="lg">
      <Flex direction="column" gap="3" align="start">
        <ClinicChip clinic={{ id: clinicId, name }} />
        {location && (
          <Text size="2" style={{ color: "var(--mp-muted)" }}>
            {location}
          </Text>
        )}
        {phone && (
          <Text size="2" asChild>
            <a href={`tel:${phone}`} style={{ color: "var(--mp-ink)" }}>
              {phone}
            </a>
          </Text>
        )}
        {doctorCount !== null && (
          <Text size="2" style={{ color: "var(--mp-muted)" }}>
            {doctorCount} verified {doctorCount === 1 ? "doctor" : "doctors"}
          </Text>
        )}
        <Button asChild variant="soft" color="teal">
          <Link href={`/clinics/${clinicId}`}>View clinic</Link>
        </Button>
      </Flex>
    </Surface>
  );
}
