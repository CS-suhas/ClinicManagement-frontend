"use client";

import { Badge, Button, Flex, Select, Tabs, Text } from "@radix-ui/themes";
import { useState } from "react";
import { useService } from "@/di/container-provider";
import type { VerificationStatus } from "@/domain/auth";
import type { Clinic, Provider } from "@/domain/entities";
import { providerFullName } from "@/domain/entities";
import { useAuth } from "@/presentation/auth/auth-provider";
import { AsyncContent } from "@/presentation/components/async-content";
import { type Column, DataTable } from "@/presentation/components/data-table";
import { DoctorChip, StatusPill } from "@/presentation/components/glance";
import { SearchField } from "@/presentation/components/search-field";
import { EmptyState } from "@/presentation/components/ui/empty-state";
import { PageHeader } from "@/presentation/components/ui/page-header";
import { TableSkeleton } from "@/presentation/components/ui/table-skeleton";
import { useAsyncData } from "@/presentation/hooks/use-async-data";
import { formatFee } from "@/presentation/lib/format";
import { useClinicDoctors } from "./use-clinic-doctors";

const TABS: { value: VerificationStatus; label: string }[] = [
  { value: "PENDING", label: "Join requests" },
  { value: "VERIFIED", label: "Doctors" },
  { value: "REJECTED", label: "Declined" },
];

const EMPTY_COPY: Record<
  VerificationStatus,
  { title: string; description: string }
> = {
  PENDING: {
    title: "No join requests",
    description:
      "Doctors who apply to join your clinic appear here for you to admit or decline.",
  },
  VERIFIED: {
    title: "No doctors yet",
    description: "Doctors you admit to the clinic are listed here.",
  },
  REJECTED: {
    title: "No declined requests",
    description: "Join requests you decline show up here.",
  },
};

/** A clinic admin's one job: the clinic's doctors and their join requests. */
export function ClinicDoctorsView() {
  const { user } = useAuth();
  const clinicIds = user?.clinicAdminOf ?? [];
  const clinicService = useService("clinicService");
  const [selected, setSelected] = useState<string | null>(null);
  const clinicId =
    selected && clinicIds.includes(selected)
      ? selected
      : (clinicIds[0] ?? null);

  const clinics = useAsyncData<Clinic[]>(
    () => Promise.all(clinicIds.map((id) => clinicService.get(id))),
    clinicIds.join(","),
  );
  const clinic = clinics.data?.find((c) => c.id === clinicId) ?? null;

  const [tab, setTab] = useState<VerificationStatus>("PENDING");
  const [search, setSearch] = useState("");
  const roster = useClinicDoctors(clinicId);

  const needle = search.trim().toLowerCase();
  const rows = roster
    .byStatus(tab)
    .filter(
      (p) =>
        !needle ||
        `${providerFullName(p)} ${p.specialty}`.toLowerCase().includes(needle),
    );

  const columns: Column<Provider>[] = [
    {
      header: "Doctor",
      cell: (p) => (
        <DoctorChip
          provider={{
            id: p.id,
            firstName: p.firstName,
            lastName: p.lastName,
            specialty: p.specialty,
            clinicId: p.clinicId,
            fee: p.fee,
          }}
        />
      ),
    },
    { header: "Specialty", cell: (p) => p.specialty, hideBelow: "md" },
    {
      header: "Fee",
      cell: (p) => formatFee(p.fee),
      align: "end",
      hideBelow: "md",
    },
    {
      header: "Status",
      cell: (p) => (
        <StatusPill
          kind="verification"
          status={p.verificationStatus ?? "PENDING"}
        />
      ),
    },
  ];

  const rowActions = (p: Provider) => {
    const name = providerFullName(p);
    const status = p.verificationStatus ?? "PENDING";
    if (status === "VERIFIED") return null;
    return (
      <Flex gap="2" justify="end">
        <Button
          size="1"
          color="teal"
          variant={status === "PENDING" ? "solid" : "soft"}
          aria-label={`Admit ${name}`}
          onClick={() => roster.verify(p)}
        >
          Admit
        </Button>
        {status === "PENDING" && (
          <Button
            size="1"
            variant="soft"
            color="red"
            aria-label={`Decline ${name}`}
            onClick={() => roster.reject(p)}
          >
            Decline
          </Button>
        )}
      </Flex>
    );
  };

  if (clinicIds.length === 0)
    return (
      <>
        <PageHeader title="Clinic doctors" />
        <EmptyState
          title="You do not administer a clinic"
          description="A platform administrator has to assign you to a clinic first."
        />
      </>
    );

  const empty = EMPTY_COPY[tab];

  return (
    <>
      <PageHeader
        title={clinic?.name ?? "Clinic doctors"}
        subtitle="Admit doctors who asked to join your clinic. Admitted doctors can take bookings right away."
      />

      {clinicIds.length > 1 && (
        <Flex align="center" gap="2" mb="4">
          <Text size="2" style={{ color: "var(--mp-muted)" }}>
            Clinic
          </Text>
          <Select.Root
            value={clinicId ?? undefined}
            onValueChange={setSelected}
          >
            <Select.Trigger aria-label="Clinic" />
            <Select.Content>
              {clinicIds.map((id) => (
                <Select.Item key={id} value={id}>
                  {clinics.data?.find((c) => c.id === id)?.name ?? "Clinic"}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Flex>
      )}

      <Tabs.Root
        value={tab}
        onValueChange={(value) => setTab(value as VerificationStatus)}
      >
        <Flex justify="between" align="center" gap="3" wrap="wrap" mb="4">
          <Tabs.List aria-label="Doctor status">
            {TABS.map((item) => {
              const count = roster.byStatus(item.value).length;
              return (
                <Tabs.Trigger key={item.value} value={item.value}>
                  <Flex align="center" gap="2">
                    {item.label}
                    {!roster.loading && count > 0 && (
                      <Badge
                        size="1"
                        radius="full"
                        color={item.value === "PENDING" ? "amber" : "gray"}
                      >
                        {count}
                      </Badge>
                    )}
                  </Flex>
                </Tabs.Trigger>
              );
            })}
          </Tabs.List>
          <div className="w-full max-w-xs">
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Search doctors"
              fullWidth
            />
          </div>
        </Flex>

        <Tabs.Content value={tab}>
          <AsyncContent
            loading={roster.loading}
            error={roster.error}
            isEmpty={rows.length === 0}
            onRetry={() => void roster.reload()}
            skeleton={
              <TableSkeleton
                columns={["chip", "text", "number", "short"]}
                rows={5}
              />
            }
            empty={
              needle ? (
                <EmptyState
                  variant="no-matches"
                  title="No doctors match your search"
                  description={`Nothing here matches "${search.trim()}".`}
                  onClearFilters={() => setSearch("")}
                />
              ) : (
                <EmptyState
                  title={empty.title}
                  description={empty.description}
                />
              )
            }
          >
            <DataTable
              columns={columns}
              rows={rows}
              rowLabel={(p) => providerFullName(p)}
              rowActions={rowActions}
              caption={TABS.find((t) => t.value === tab)?.label ?? ""}
            />
          </AsyncContent>
        </Tabs.Content>
      </Tabs.Root>
    </>
  );
}
