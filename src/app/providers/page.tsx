"use client";

import { PlusIcon } from "@radix-ui/react-icons";
import { Button, Flex, Select } from "@radix-ui/themes";
import { useState } from "react";
import { useService } from "@/di/container-provider";
import {
  type Clinic,
  type Provider,
  providerFullName,
} from "@/domain/entities";
import { AsyncContent } from "@/presentation/components/async-content";
import { ConfirmDeleteDialog } from "@/presentation/components/confirm-delete-dialog";
import { type Column, DataTable } from "@/presentation/components/data-table";
import { ErrorCallout } from "@/presentation/components/error-callout";
import { PageHeader } from "@/presentation/components/page-header";
import { PaginationControls } from "@/presentation/components/pagination-controls";
import { SearchField } from "@/presentation/components/search-field";
import { ProviderFormDialog } from "@/presentation/features/providers/provider-form-dialog";
import { useAsyncData } from "@/presentation/hooks/use-async-data";
import { PAGE_SIZE, useCrudPage } from "@/presentation/hooks/use-crud-page";

const ALL_CLINICS = "all";

export default function Page() {
  const providerService = useService("providerService");
  const clinicService = useService("clinicService");
  const [clinicFilter, setClinicFilter] = useState<string>(ALL_CLINICS);
  const {
    query,
    page,
    setQuery,
    setPage,
    data,
    rows: providers,
    loading,
    error,
    reload,
    form,
    deleting,
    setDeleting,
    confirmDelete,
  } = useCrudPage(providerService, {
    extraOptions: () => ({
      clinicId: clinicFilter === ALL_CLINICS ? undefined : clinicFilter,
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
  const clinicName = (id: string) => clinics.find((c) => c.id === id)?.name;
  const columns: Column<Provider>[] = [
    { header: "Name", cell: providerFullName },
    { header: "Specialty", cell: (p) => p.specialty },
    { header: "Clinic", cell: (p) => clinicName(p.clinicId) ?? "—" },
  ];

  return (
    <>
      <PageHeader
        title="Providers"
        description="Clinicians who see patients at a clinic."
        actions={
          <Button
            onClick={form.openCreate}
            disabled={clinicsLoading || !clinicData}
          >
            <PlusIcon /> New provider
          </Button>
        }
      />
      {clinicError && (
        <Flex mb="3">
          <ErrorCallout
            message={clinicError}
            onRetry={() => void reloadClinics()}
          />
        </Flex>
      )}
      <Flex mb="3" gap="3" wrap="wrap">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search providers…"
        />
        <Select.Root
          value={clinicFilter}
          onValueChange={(value) => {
            setClinicFilter(value);
            setPage(1);
          }}
        >
          <Select.Trigger aria-label="Filter by clinic" />
          <Select.Content>
            <Select.Item value={ALL_CLINICS}>All clinics</Select.Item>
            {clinics.map((c: Clinic) => (
              <Select.Item key={c.id} value={c.id}>
                {c.name}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </Flex>

      <AsyncContent
        loading={loading}
        error={error}
        isEmpty={providers.length === 0}
        emptyText={
          query || clinicFilter !== ALL_CLINICS
            ? "No providers match your filters."
            : "No providers yet."
        }
        onRetry={reload}
      >
        <DataTable
          columns={columns}
          rows={providers}
          rowLabel={providerFullName}
          onEdit={form.openEdit}
          onDelete={setDeleting}
        />
      </AsyncContent>
      {data && (
        <PaginationControls
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={data.totalCount}
          onPageChange={setPage}
        />
      )}

      <ProviderFormDialog
        open={form.open}
        onOpenChange={form.onOpenChange}
        provider={form.editing}
        clinics={clinics}
        onSaved={reload}
      />
      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete provider?"
        description={`"${deleting ? providerFullName(deleting) : ""}" will be permanently removed.`}
        onConfirm={confirmDelete}
        onDeleted={reload}
      />
    </>
  );
}
