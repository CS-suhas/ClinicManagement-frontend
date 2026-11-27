"use client";

import { Button, Flex, Tabs, Text } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { AsyncContent } from "@/components/async-content";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { type Column, DataTable } from "@/components/data-table";
import { DoctorChip, StatusPill } from "@/components/glance";
import { SearchField } from "@/components/search-field";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import type { Provider } from "@/features/providers/schemas";
import { providerFullName } from "@/features/providers/utils";
import { formatFee } from "@/lib/format";
import { type ApprovalTab, useDoctorApprovals } from "./use-doctor-approvals";

const TABS: { value: ApprovalTab; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "REJECTED", label: "Rejected" },
  { value: "VERIFIED", label: "Verified" },
];

const EMPTY_COPY: Record<ApprovalTab, { title: string; description: string }> =
  {
    PENDING: {
      title: "The queue is clear",
      description:
        "No doctor applications are waiting for review. New applications appear here.",
    },
    REJECTED: {
      title: "No rejected applications",
      description: "Applications an administrator has rejected show up here.",
    },
    VERIFIED: {
      title: "No verified doctors yet",
      description: "Doctors appear here once an administrator approves them.",
    },
  };

export function ApprovalsView() {
  const [tab, setTab] = useState<ApprovalTab>("PENDING");
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [bulk, setBulk] = useState<{
    rows: Provider[];
    clear: () => void;
  } | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchText.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const queue = useDoctorApprovals(tab, search);
  const isPending = tab === "PENDING";

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
    {
      header: "Specialty",
      cell: (p) => p.specialty,
      hideBelow: "md",
    },
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
    if (p.verificationStatus === "PENDING")
      return (
        <Flex gap="2" justify="end">
          <Button
            size="1"
            color="teal"
            aria-label={`Approve ${name}`}
            onClick={() => queue.verify(p)}
          >
            Approve
          </Button>
          <Button
            size="1"
            variant="soft"
            color="red"
            aria-label={`Reject ${name}`}
            onClick={() => queue.reject(p)}
          >
            Reject
          </Button>
        </Flex>
      );
    if (p.verificationStatus === "REJECTED")
      return (
        <Flex gap="2" justify="end">
          <Button
            size="1"
            variant="soft"
            color="teal"
            aria-label={`Verify anyway: ${name}`}
            onClick={() => queue.verify(p)}
          >
            Verify anyway
          </Button>
        </Flex>
      );
    return null;
  };

  const confirmBulk = async () => {
    if (!bulk) return;
    setBulkBusy(true);
    try {
      await queue.verifyMany(bulk.rows, bulk.clear);
    } finally {
      setBulkBusy(false);
      setBulk(null);
    }
  };

  const empty = EMPTY_COPY[tab];

  return (
    <>
      <PageHeader
        title="Doctor approvals"
        subtitle="Review doctor applications. Approved doctors can take bookings at their clinic right away."
      />

      <Tabs.Root
        value={tab}
        onValueChange={(value) => setTab(value as ApprovalTab)}
      >
        <Flex justify="between" align="center" gap="3" wrap="wrap" mb="4">
          <Tabs.List aria-label="Application status">
            {TABS.map((item) => (
              <Tabs.Trigger key={item.value} value={item.value}>
                {item.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <div className="w-full max-w-xs">
            <SearchField
              value={searchText}
              onChange={setSearchText}
              placeholder="Search doctors"
              fullWidth
            />
          </div>
        </Flex>

        <Tabs.Content value={tab}>
          <AsyncContent
            loading={queue.loading}
            error={queue.error}
            isEmpty={queue.providers.length === 0}
            onRetry={() => void queue.reload()}
            skeleton={
              <TableSkeleton
                columns={["chip", "text", "number", "short"]}
                rows={5}
              />
            }
            empty={
              search ? (
                <EmptyState
                  variant="no-matches"
                  title="No doctors match your search"
                  description={`Nothing in ${tab.toLowerCase()} matches "${search}".`}
                  onClearFilters={() => setSearchText("")}
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
              rows={queue.providers}
              rowLabel={(p) => providerFullName(p)}
              rowActions={rowActions}
              caption={`${TABS.find((t) => t.value === tab)?.label ?? ""} doctor applications`}
              selection={
                isPending
                  ? {
                      bulkActions: (selected, clear) => (
                        <Button
                          size="1"
                          color="teal"
                          onClick={() => setBulk({ rows: selected, clear })}
                        >
                          Approve {selected.length}
                        </Button>
                      ),
                    }
                  : undefined
              }
            />
          </AsyncContent>
        </Tabs.Content>
      </Tabs.Root>

      <ConfirmActionDialog
        open={bulk !== null}
        onOpenChange={(open) => !open && !bulkBusy && setBulk(null)}
        title={`Approve ${bulk?.rows.length ?? 0} doctors?`}
        description={
          <Text as="span" size="2">
            {bulk?.rows.map(providerFullName).join(", ")}. Each doctor is
            approved one at a time.
          </Text>
        }
        confirmLabel="Approve"
        busy={bulkBusy}
        onConfirm={() => void confirmBulk()}
      />
    </>
  );
}
