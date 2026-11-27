"use client";

import { Button, Flex, Text } from "@radix-ui/themes";
import Link from "next/link";
import { useEffect } from "react";
import { AsyncContent } from "@/components/async-content";
import { ClinicChip } from "@/components/glance";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { useAuth } from "@/features/auth/auth-provider";
import { useClinicSummary } from "@/features/clinics/api";
import { getErrorMessage } from "@/lib/errors";
import { useMyProvider } from "../api";

export function MyClinicView() {
  const { user, refresh } = useAuth();
  const provider = useMyProvider(user?.provider?.id ?? null);
  const clinicId = provider.data?.clinicId ?? null;
  const summary = useClinicSummary(clinicId);

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
        loading={provider.isLoading}
        error={provider.isError ? getErrorMessage(provider.error) : null}
        isEmpty={false}
        onRetry={() => void provider.refetch()}
      >
        {clinicId && (
          <CurrentClinic
            clinicId={clinicId}
            name={summary.data?.clinic?.name ?? "Your clinic"}
            location={summary.data?.clinic?.address ?? null}
            phone={summary.data?.clinic?.phoneNumber ?? null}
            doctorCount={summary.data?.providerCount ?? null}
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
