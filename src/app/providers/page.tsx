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
import { usePagedSearch } from "@/presentation/hooks/use-paged-search";

const ALL_CLINICS = "all";
const PAGE_SIZE = 20;

export default function Page() {
  const providerService = useService("providerService");
  const clinicService = useService("clinicService");
  const { query, search, page, setQuery, setPage } = usePagedSearch();
  const [clinicFilter, setClinicFilter] = useState<string>(ALL_CLINICS);
  const { data, loading, error, reload } = useAsyncData(
    () =>
      providerService.search({
        search: search || undefined,
        clinicId: clinicFilter === ALL_CLINICS ? undefined : clinicFilter,
        page,
        pageSize: PAGE_SIZE,
      }),
    `${search}|${clinicFilter}|${page}`,
  );
  const {
    data: clinicData,
    error: clinicError,
    loading: clinicsLoading,
    reload: reloadClinics,
  } = useAsyncData(() => clinicService.search({ page: 1, pageSize: 100 }));
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [deleting, setDeleting] = useState<Provider | null>(null);

  const providers = data?.items ?? [];
  const clinics = clinicData?.items ?? [];
  const clinicName = (id: string) => clinics.find((c) => c.id === id)?.name;
  const columns: Column<Provider>[] = [
    { header: "Name", cell: providerFullName },
    { header: "Specialty", cell: (p) => p.specialty },
    { header: "Clinic", cell: (p) => clinicName(p.clinicId) ?? "—" },
  ];

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (p: Provider) => {
    setEditing(p);
    setFormOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Providers"
        description="Clinicians who see patients at a clinic."
        actions={
          <Button onClick={openCreate} disabled={clinicsLoading || !clinicData}>
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
          onEdit={openEdit}
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
        open={formOpen}
        onOpenChange={setFormOpen}
        provider={editing}
        clinics={clinics}
        onSaved={reload}
      />
      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete provider?"
        description={`"${deleting ? providerFullName(deleting) : ""}" will be permanently removed.`}
        onConfirm={() => providerService.delete(deleting?.id ?? "")}
        onDeleted={reload}
      />
    </>
  );
}
