"use client";

import { PlusIcon } from "@radix-ui/react-icons";
import { Button, Flex } from "@radix-ui/themes";
import { useService } from "@/di/container-provider";
import type { AllergyType } from "@/domain/entities";
import { AsyncContent } from "@/presentation/components/async-content";
import { ConfirmDeleteDialog } from "@/presentation/components/confirm-delete-dialog";
import { type Column, DataTable } from "@/presentation/components/data-table";
import { PageHeader } from "@/presentation/components/page-header";
import { PaginationControls } from "@/presentation/components/pagination-controls";
import { SearchField } from "@/presentation/components/search-field";
import { AllergyTypeFormDialog } from "@/presentation/features/allergies/allergy-type-form-dialog";
import { PAGE_SIZE, useCrudPage } from "@/presentation/hooks/use-crud-page";

const columns: Column<AllergyType>[] = [
  { header: "Name", cell: (a) => a.name },
];

export default function Page() {
  const allergyTypeService = useService("allergyTypeService");
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
  } = useCrudPage(allergyTypeService);

  return (
    <>
      <PageHeader
        title="Allergies"
        description="Catalogue of allergy types that can be recorded on patients."
        actions={
          <Button onClick={form.openCreate}>
            <PlusIcon /> New allergy
          </Button>
        }
      />
      <Flex mb="3">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search allergies…"
        />
      </Flex>

      <AsyncContent
        loading={loading}
        error={error}
        isEmpty={rows.length === 0}
        emptyText={
          query ? "No allergies match your search." : "No allergies yet."
        }
        onRetry={reload}
      >
        <DataTable
          columns={columns}
          rows={rows}
          rowLabel={(a) => a.name}
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

      <AllergyTypeFormDialog
        open={form.open}
        onOpenChange={form.onOpenChange}
        allergyType={form.editing}
        onSaved={reload}
      />
      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete allergy?"
        description={`"${deleting?.name}" will be permanently removed. Allergies recorded on patients block deletion.`}
        onConfirm={confirmDelete}
        onDeleted={reload}
      />
    </>
  );
}
