"use client";

import { PlusIcon } from "@radix-ui/react-icons";
import { Button, Flex, Table } from "@radix-ui/themes";
import { useState } from "react";
import { useService } from "@/di/container-provider";
import type { AllergyType } from "@/domain/entities";
import { AsyncContent } from "@/presentation/components/async-content";
import { ConfirmDeleteDialog } from "@/presentation/components/confirm-delete-dialog";
import { PageHeader } from "@/presentation/components/page-header";
import { RowActions } from "@/presentation/components/row-actions";
import { SearchField } from "@/presentation/components/search-field";
import { useAsyncData } from "@/presentation/hooks/use-async-data";
import { matchesQuery } from "@/presentation/lib/format";
import {
  AllergyTypeFormDialog,
} from "@/presentation/features/allergies/allergy-type-form-dialog";

export default function Page() {
  const allergyTypeService = useService("allergyTypeService");
  const { data, loading, error, reload } = useAsyncData(() =>
    allergyTypeService.list(),
  );
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AllergyType | null>(null);
  const [deleting, setDeleting] = useState<AllergyType | null>(null);

  const rows = (data ?? [])
    .filter((a) => matchesQuery(query, a.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (a: AllergyType) => {
    setEditing(a);
    setFormOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Allergies"
        description="Catalogue of allergy types that can be recorded on patients."
        actions={
          <Button onClick={openCreate}>
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
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell justify="end">
                Actions
              </Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((a) => (
              <Table.Row key={a.id} align="center">
                <Table.RowHeaderCell>{a.name}</Table.RowHeaderCell>
                <Table.Cell justify="end">
                  <RowActions
                    label={a.name}
                    onEdit={() => openEdit(a)}
                    onDelete={() => setDeleting(a)}
                  />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </AsyncContent>

      <AllergyTypeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        allergyType={editing}
        onSaved={reload}
      />
      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete allergy?"
        description={`"${deleting?.name}" will be permanently removed. Allergies recorded on patients block deletion.`}
        onConfirm={() => allergyTypeService.delete(deleting?.id ?? "")}
        onDeleted={reload}
      />
    </>
  );
}
