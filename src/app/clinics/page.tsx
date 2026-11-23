"use client";

import { PlusIcon } from "@radix-ui/react-icons";
import { Button, Flex, Table } from "@radix-ui/themes";
import { useState } from "react";
import { useService } from "@/di/container-provider";
import type { Clinic } from "@/domain/entities";
import { AsyncContent } from "@/presentation/components/async-content";
import { ConfirmDeleteDialog } from "@/presentation/components/confirm-delete-dialog";
import { PageHeader } from "@/presentation/components/page-header";
import { PaginationControls } from "@/presentation/components/pagination-controls";
import { RowActions } from "@/presentation/components/row-actions";
import { SearchField } from "@/presentation/components/search-field";
import { ClinicFormDialog } from "@/presentation/features/clinics/clinic-form-dialog";
import { useAsyncData } from "@/presentation/hooks/use-async-data";
import { usePagedSearch } from "@/presentation/hooks/use-paged-search";

const PAGE_SIZE = 20;

export default function Page() {
  const clinicService = useService("clinicService");
  const { query, search, page, setQuery, setPage } = usePagedSearch();
  const { data, loading, error, reload } = useAsyncData(
    () =>
      clinicService.search({
        search: search || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    `${search}|${page}`,
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Clinic | null>(null);
  const [deleting, setDeleting] = useState<Clinic | null>(null);

  const rows = data?.items ?? [];

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (c: Clinic) => {
    setEditing(c);
    setFormOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Clinics"
        description="Locations where providers practice."
        actions={
          <Button onClick={openCreate}>
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
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Location</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Phone</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell justify="end">
                Actions
              </Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((c) => (
              <Table.Row key={c.id} align="center">
                <Table.RowHeaderCell>{c.name}</Table.RowHeaderCell>
                <Table.Cell>{c.location ?? ""}</Table.Cell>
                <Table.Cell>{c.phoneNumber}</Table.Cell>
                <Table.Cell justify="end">
                  <RowActions
                    label={c.name}
                    onEdit={() => openEdit(c)}
                    onDelete={() => setDeleting(c)}
                  />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
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
        open={formOpen}
        onOpenChange={setFormOpen}
        clinic={editing}
        onSaved={reload}
      />
      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete clinic?"
        description={`"${deleting?.name}" will be permanently removed.`}
        onConfirm={() => clinicService.delete(deleting?.id ?? "")}
        onDeleted={reload}
      />
    </>
  );
}
