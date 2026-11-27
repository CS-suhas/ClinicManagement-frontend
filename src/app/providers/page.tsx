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
import { useNotify } from "@/components/notifications";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useService } from "@/di/container-provider";
import {
  PROVIDER_GENDER_LABELS,
  type Provider,
  providerFullName,
} from "@/domain/entities";
import { useAuth } from "@/features/auth/auth-provider";
import { ProviderDetails } from "@/features/providers/components/provider-details";
import { ProviderFormDialog } from "@/features/providers/components/provider-form-dialog";
import { useAsyncData } from "@/hooks/use-async-data";
import { PAGE_SIZE, useCrudPage } from "@/hooks/use-crud-page";
import { invalidateGlanceData } from "@/hooks/use-glance-data";
import { formatFee } from "@/lib/format";

type Decision = "verify" | "reject";

const DECISION_VERB: Record<Decision, string> = {
  verify: "verified",
  reject: "rejected",
};

const DECISION_STATUS: Record<Decision, "VERIFIED" | "REJECTED"> = {
  verify: "VERIFIED",
  reject: "REJECTED",
};

export default function Page() {
  const clinicService = useService("clinicService");
  const providerService = useService("providerService");
  const { user } = useAuth();
  const { notifyError, notifySuccess } = useNotify();
  const isAdmin = !!user?.roles.includes("admin");
  const [clinicFilter, setClinicFilter] = useState<string>(ALL_FILTER);
  const [bulk, setBulk] = useState<{
    decision: Decision;
    targets: Provider[];
    clear: () => void;
  } | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const crud = useCrudPage(providerService, {
    entityName: "provider",
    extraOptions: () => ({
      clinicId: clinicFilter === ALL_FILTER ? undefined : clinicFilter,
    }),
    extraKey: clinicFilter,
  });
  const {
    data: clinicData,
    error: clinicError,
    loading: clinicsLoading,
    reload: reloadClinics,
  } = useAsyncData(() => clinicService.search({ page: 1, pageSize: 100 }));

  const clinics = clinicData?.items ?? [];
  const clinicById = new Map(clinics.map((c) => [c.id, c]));
  const hasFilters = crud.query !== "" || clinicFilter !== ALL_FILTER;

  /** One doctor's verify or reject: the badge flips at once, rolled back on failure. */
  const decide = (provider: Provider, decision: Decision) => {
    const name = providerFullName(provider);
    const previous = provider.verificationStatus;
    crud.runOptimistic({
      apply: () =>
        crud.patch(provider.id, {
          verificationStatus: DECISION_STATUS[decision],
        }),
      rollback: () => crud.patch(provider.id, { verificationStatus: previous }),
      request: () =>
        decision === "verify"
          ? providerService.verify(provider.id)
          : providerService.reject(provider.id),
      failureMessage: `Could not ${decision === "verify" ? "verify" : "reject"} ${name}`,
      successMessage: `${name} ${DECISION_VERB[decision]}`,
    });
  };

  /** Sends the decisions one after another and reports how many worked. */
  const runBulk = async () => {
    if (!bulk) return;
    setBulkBusy(true);
    let done = 0;
    let failed = 0;
    for (const provider of bulk.targets) {
      try {
        if (bulk.decision === "verify")
          await providerService.verify(provider.id);
        else await providerService.reject(provider.id);
        crud.patch(provider.id, {
          verificationStatus: DECISION_STATUS[bulk.decision],
        });
        done++;
      } catch {
        failed++;
      }
    }
    setBulkBusy(false);
    setBulk(null);
    bulk.clear();
    invalidateGlanceData();
    void crud.reload();
    const summary = `${done} ${DECISION_VERB[bulk.decision]}${failed ? `, ${failed} failed` : ""}`;
    if (failed > 0) notifyError(summary);
    else notifySuccess(summary);
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
      cell: (p) => (p.gender ? PROVIDER_GENDER_LABELS[p.gender] : "—"),
    },
  ];

  return (
    <>
      <ListPage
        title="Providers"
        description="Clinicians who see patients at a clinic."
        entity="provider"
        entityPlural="providers"
        list={crud}
        pageSize={PAGE_SIZE}
        onCreate={crud.form.openCreate}
        createDisabled={clinicsLoading || !clinicData}
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
                  onRemove: () => {
                    setClinicFilter(ALL_FILTER);
                    crud.setPage(1);
                  },
                },
              ]
        }
        onClearFilters={() => {
          setClinicFilter(ALL_FILTER);
          crud.setPage(1);
        }}
        banner={
          clinicError && (
            <Flex mb="3">
              <ErrorCallout
                message={clinicError}
                onRetry={() => void reloadClinics()}
              />
            </Flex>
          )
        }
        filters={
          <FilterSelect
            label="Filter by clinic"
            allLabel="All clinics"
            value={clinicFilter}
            options={clinics.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(value) => {
              setClinicFilter(value);
              crud.setPage(1);
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
          rows={crud.rows}
          rowLabel={providerFullName}
          onEdit={crud.form.openEdit}
          onDelete={crud.setDeleting}
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
        open={crud.form.open}
        onOpenChange={crud.form.onOpenChange}
        provider={crud.form.editing}
        clinics={clinics}
        onSave={crud.save}
      />
      <ConfirmDeleteDialog
        {...crud.deleteDialog}
        title="Delete provider?"
        description={`"${crud.deleting ? providerFullName(crud.deleting) : ""}" will be permanently removed.`}
      />
      <ConfirmActionDialog
        open={bulk !== null}
        onOpenChange={(open) => !open && setBulk(null)}
        busy={bulkBusy}
        title={
          bulk?.decision === "verify"
            ? `Verify ${bulk.targets.length} doctor${bulk.targets.length === 1 ? "" : "s"}?`
            : `Reject ${bulk?.targets.length ?? 0} doctor${bulk?.targets.length === 1 ? "" : "s"}?`
        }
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
        onConfirm={() => void runBulk()}
      />
    </>
  );
}
