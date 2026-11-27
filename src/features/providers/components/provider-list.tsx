"use client";

import { Button, Flex, Text } from "@radix-ui/themes";
import { useState } from "react";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { type Column, DataTable } from "@/components/data-table";
import { ErrorCallout } from "@/components/error-callout";
import { ALL_FILTER, FilterSelect } from "@/components/filter-select";
import { ClinicChip } from "@/components/glance/clinic-chip";
import { DoctorChip } from "@/components/glance/doctor-chip";
import { StatusPill } from "@/components/glance/status-chip";
import { ListPage } from "@/components/list-page";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { useAllClinics } from "@/features/clinics/api";
import { PAGE_SIZE } from "@/hooks/use-paged-list";
import { byId } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { formatFee } from "@/lib/format";
import { useDeleteProvider, useProviderList } from "../api";
import { type Provider, providerGenderLabels } from "../schemas";
import { providerFullName } from "../utils";
import { ProviderDetails } from "./provider-details";
import { ProviderFormDialog } from "./provider-form-dialog";
import { type Decision, useProviderDecisions } from "./use-provider-decisions";

const DECISION_TITLE_VERB: Record<Decision, string> = {
  verify: "Verify",
  reject: "Reject",
};

export function ProviderList() {
  const { user } = useAuth();
  const isAdmin = !!user?.roles.includes("admin");
  const [clinicFilter, setClinicFilter] = useState<string>(ALL_FILTER);
  const [bulk, setBulk] = useState<{
    decision: Decision;
    targets: Provider[];
    clear: () => void;
  } | null>(null);
  const [formState, setFormState] = useState<{
    open: boolean;
    editing: Provider | null;
  }>({ open: false, editing: null });
  const [deleting, setDeleting] = useState<Provider | null>(null);

  const list = useProviderList(clinicFilter);
  const clinics = useAllClinics();
  const remove = useDeleteProvider();
  const { decide, bulk: bulkDecision } = useProviderDecisions();

  const clinicItems = clinics.data ?? [];
  const clinicById = new Map(clinicItems.map((c) => [c.id, c]));
  const hasFilters = list.query !== "" || clinicFilter !== ALL_FILTER;
  const clearClinicFilter = () => {
    setClinicFilter(ALL_FILTER);
    list.setPage(1);
  };

  const columns: Column<Provider>[] = [
    {
      id: "name",
      header: "Name",
      sortValue: providerFullName,
      cell: (p) => (
        <DoctorChip
          provider={{
            ...p,
            clinicName: clinicById.get(p.clinicId)?.name ?? null,
          }}
        />
      ),
    },
    {
      id: "specialty",
      header: "Specialty",
      hideBelow: "md",
      sortValue: (p) => p.specialty,
      cell: (p) => <Text size="2">{p.specialty}</Text>,
    },
    {
      id: "clinic",
      header: "Clinic",
      cell: (p) => {
        const clinic = clinicById.get(p.clinicId);
        return clinic ? (
          <ClinicChip
            clinic={{ id: clinic.id, name: clinic.name }}
            variant="inline"
          />
        ) : (
          <Text size="2" style={{ color: "var(--mp-muted)" }}>
            —
          </Text>
        );
      },
    },
    {
      id: "verification",
      header: "Verification",
      cell: (p) => (
        <Flex align="center" gap="2" wrap="wrap">
          {p.verificationStatus ? (
            <StatusPill kind="verification" status={p.verificationStatus} />
          ) : (
            <Text size="2" style={{ color: "var(--mp-muted)" }}>
              —
            </Text>
          )}
          {isAdmin && p.verificationStatus === "PENDING" && (
            <>
              <Button size="1" color="teal" onClick={() => decide(p, "verify")}>
                Verify
              </Button>
              <Button
                size="1"
                variant="soft"
                color="red"
                onClick={() => decide(p, "reject")}
              >
                Reject
              </Button>
            </>
          )}
        </Flex>
      ),
    },
    {
      id: "fee",
      header: "Fee",
      align: "end",
      sortValue: (p) => p.fee ?? null,
      cell: (p) => <span className="tabular-nums">{formatFee(p.fee)}</span>,
    },
    {
      id: "gender",
      header: "Gender",
      hideBelow: "md",
      cell: (p) => (p.gender ? providerGenderLabels[p.gender] : "—"),
    },
  ];

  const confirmBulk = async () => {
    if (!bulk) return;
    await bulkDecision.mutateAsync({
      decision: bulk.decision,
      targets: bulk.targets,
    });
    setBulk(null);
    bulk.clear();
  };

  const bulkCount = bulk?.targets.length ?? 0;
  const bulkPlural = bulkCount === 1 ? "" : "s";

  return (
    <>
      <ListPage
        title="Providers"
        description="Clinicians who see patients at a clinic."
        entity="provider"
        entityPlural="providers"
        list={list}
        pageSize={PAGE_SIZE}
        onCreate={() => setFormState({ open: true, editing: null })}
        createDisabled={clinics.isPending || !clinics.data}
        emptyText={
          hasFilters
            ? "Try a different search or clear the filters."
            : "Add a provider to start booking visits."
        }
        activeFilters={
          clinicFilter === ALL_FILTER
            ? []
            : [
                {
                  id: "clinic",
                  label: clinicById.get(clinicFilter)?.name ?? "Clinic",
                  onRemove: clearClinicFilter,
                },
              ]
        }
        onClearFilters={clearClinicFilter}
        banner={
          clinics.isError && (
            <Flex mb="3">
              <ErrorCallout
                message={getErrorMessage(clinics.error)}
                onRetry={() => void clinics.refetch()}
              />
            </Flex>
          )
        }
        filters={
          <FilterSelect
            label="Filter by clinic"
            allLabel="All clinics"
            value={clinicFilter}
            options={clinicItems.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(value) => {
              setClinicFilter(value);
              list.setPage(1);
            }}
          />
        }
        skeleton={
          <TableSkeleton
            columns={["chip", "text", "chip", "chip", "number", "text"]}
            selectable={isAdmin}
            expandable={isAdmin}
          />
        }
      >
        <DataTable
          columns={columns}
          rows={list.rows}
          rowLabel={providerFullName}
          onEdit={(p) => setFormState({ open: true, editing: p })}
          onDelete={setDeleting}
          expandable={
            isAdmin
              ? { render: (p) => <ProviderDetails provider={p} /> }
              : undefined
          }
          selection={
            isAdmin
              ? {
                  bulkActions: (selected, clear) => {
                    const pending = selected.filter(
                      (p) => p.verificationStatus === "PENDING",
                    );
                    return (
                      <Flex gap="2" wrap="wrap">
                        <Button
                          size="1"
                          color="teal"
                          disabled={pending.length === 0}
                          onClick={() =>
                            setBulk({
                              decision: "verify",
                              targets: pending,
                              clear,
                            })
                          }
                        >
                          Verify {pending.length} pending
                        </Button>
                        <Button
                          size="1"
                          variant="soft"
                          color="red"
                          disabled={pending.length === 0}
                          onClick={() =>
                            setBulk({
                              decision: "reject",
                              targets: pending,
                              clear,
                            })
                          }
                        >
                          Reject pending
                        </Button>
                      </Flex>
                    );
                  },
                  isSelectable: (p) => p.verificationStatus === "PENDING",
                  disabledReason: () => "Only pending doctors can be decided",
                }
              : undefined
          }
        />
      </ListPage>

      <ProviderFormDialog
        open={formState.open}
        onOpenChange={(open) => setFormState((s) => ({ ...s, open }))}
        provider={formState.editing}
        clinics={clinicItems}
      />
      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={() => {
          if (deleting) remove.mutate(byId(deleting.id));
          setDeleting(null);
        }}
        title="Delete provider?"
        description={`"${deleting ? providerFullName(deleting) : ""}" will be permanently removed.`}
      />
      <ConfirmActionDialog
        open={bulk !== null}
        onOpenChange={(open) =>
          !open && !bulkDecision.isPending && setBulk(null)
        }
        busy={bulkDecision.isPending}
        title={`${DECISION_TITLE_VERB[bulk?.decision ?? "reject"]} ${bulkCount} doctor${bulkPlural}?`}
        description={
          <Flex direction="column" gap="2">
            <Text size="2">Only pending applications are affected.</Text>
            <ul className="list-disc pl-5 text-[13px]">
              {bulk?.targets.map((p) => (
                <li key={p.id}>{providerFullName(p)}</li>
              ))}
            </ul>
          </Flex>
        }
        confirmLabel={bulk?.decision === "verify" ? "Verify" : "Reject"}
        confirmColor={bulk?.decision === "verify" ? "teal" : "red"}
        onConfirm={() => void confirmBulk()}
      />
    </>
  );
}
