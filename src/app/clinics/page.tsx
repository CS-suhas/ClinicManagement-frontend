"use client";

import { PlusIcon } from "@radix-ui/react-icons";
import { Button, Flex } from "@radix-ui/themes";
import { useService } from "@/di/container-provider";
import type { Clinic } from "@/domain/entities";
import { AsyncContent } from "@/presentation/components/async-content";
import { ConfirmDeleteDialog } from "@/presentation/components/confirm-delete-dialog";
import { type Column, DataTable } from "@/presentation/components/data-table";
import { PageHeader } from "@/presentation/components/page-header";
import { PaginationControls } from "@/presentation/components/pagination-controls";
import { SearchField } from "@/presentation/components/search-field";
import { ClinicFormDialog } from "@/presentation/features/clinics/clinic-form-dialog";
import { PAGE_SIZE, useCrudPage } from "@/presentation/hooks/use-crud-page";

const columns: Column<Clinic>[] = [
  { header: "Name", cell: (c) => c.name },
  { header: "Location", cell: (c) => c.location ?? "" },
  { header: "Phone", cell: (c) => c.phoneNumber },
];

export default function Page() {
  const clinicService = useService("clinicService");
  const {
    query,
    page,
    setQuery,
    setPage,
    data,
    rows,
    loading,
    error,
    reload,
    form,
    deleting,
    setDeleting,
    confirmDelete,
  } = useCrudPage(clinicService);

  return (
    <>
      <PageHeader
        title="Clinics"
        description="Locations where providers practice."
        actions={
          <Button onClick={form.openCreate}>
            <PlusIcon /> New clinic
          </Button>
        }
      />
      <Flex mb="3">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search clinics…"
        />
      </Flex>

      <AsyncContent
        loading={loading}
        error={error}
        isEmpty={rows.length === 0}
        emptyText={query ? "No clinics match your search." : "No clinics yet."}
        onRetry={reload}
      >
        <DataTable
          columns={columns}
          rows={rows}
          rowLabel={(c) => c.name}
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

      <ClinicFormDialog
        open={form.open}
        onOpenChange={form.onOpenChange}
        clinic={form.editing}
        onSaved={reload}
      />
      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete clinic?"
        description={`"${deleting?.name}" will be permanently removed.`}
        onConfirm={confirmDelete}
        onDeleted={reload}
      />
    </>
  );
}
