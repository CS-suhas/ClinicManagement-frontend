"use client";

import { Button, Flex, Tabs, Text } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import type { Provider } from "@/domain/entities";
import { providerFullName } from "@/domain/entities";
import { AsyncContent } from "@/presentation/components/async-content";
import { ConfirmActionDialog } from "@/presentation/components/confirm-action-dialog";
import { type Column, DataTable } from "@/presentation/components/data-table";
import { DoctorChip, StatusPill } from "@/presentation/components/glance";
import { SearchField } from "@/presentation/components/search-field";
import { EmptyState } from "@/presentation/components/ui/empty-state";
import { PageHeader } from "@/presentation/components/ui/page-header";
import { TableSkeleton } from "@/presentation/components/ui/table-skeleton";
import { formatFee } from "@/presentation/lib/format";
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

/** Admin queue for doctor applications: pending, rejected and verified, with approve and reject. */
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
            clinicId: p.clinicId || undefined,
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
        subtitle="Review doctor applications. Approved doctors can take bookings once they join a clinic."
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
