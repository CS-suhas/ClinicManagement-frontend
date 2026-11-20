"use client";

import { PlusIcon } from "@radix-ui/react-icons";
import { Button, Flex, Select, Table } from "@radix-ui/themes";
import { useState } from "react";
import { useService } from "@/di/container-provider";
import {
  type Clinic,
  type Provider,
  providerFullName,
} from "@/domain/entities";
import { AsyncContent } from "@/presentation/components/async-content";
import { ConfirmDeleteDialog } from "@/presentation/components/confirm-delete-dialog";
import { PageHeader } from "@/presentation/components/page-header";
import { RowActions } from "@/presentation/components/row-actions";
import { SearchField } from "@/presentation/components/search-field";
import { useAsyncData } from "@/presentation/hooks/use-async-data";
import { matchesQuery } from "@/presentation/lib/format";
import {
  ProviderFormDialog,
} from "@/presentation/features/providers/provider-form-dialog";

const ALL_CLINICS = "all";

export default function Page() {
  const providerService = useService("providerService");
  const clinicService = useService("clinicService");
  const { data, loading, error, reload } = useAsyncData(async () => {
    const [providers, clinics] = await Promise.all([
      providerService.list(),
      clinicService.list(),
    ]);
    return { providers, clinics };
  });
  const [query, setQuery] = useState("");
  const [clinicFilter, setClinicFilter] = useState<string>(ALL_CLINICS);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [deleting, setDeleting] = useState<Provider | null>(null);

  const providers = data?.providers ?? [];
  const clinics = data?.clinics ?? [];
  const clinicName = (id: string) => clinics.find((c) => c.id === id)?.name;

  const rows = providers.filter(
    (p) =>
      (clinicFilter === ALL_CLINICS || p.clinicId === clinicFilter) &&
      matchesQuery(
        query,
        providerFullName(p),
        p.firstName,
        p.lastName,
        p.specialty,
        clinicName(p.clinicId),
      ),
  );

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
          <Button onClick={openCreate}>
            <PlusIcon /> New provider
          </Button>
        }
      />
      <Flex mb="3" gap="3" wrap="wrap">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search providers…"
        />
        <Select.Root value={clinicFilter} onValueChange={setClinicFilter}>
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
        isEmpty={rows.length === 0}
        emptyText={
          query || clinicFilter !== ALL_CLINICS
            ? "No providers match your filters."
            : "No providers yet."
        }
        onRetry={reload}
      >
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Specialty</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Clinic</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell justify="end">
                Actions
              </Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((p) => (
              <Table.Row key={p.id} align="center">
                <Table.RowHeaderCell>{providerFullName(p)}</Table.RowHeaderCell>
                <Table.Cell>{p.specialty}</Table.Cell>
                <Table.Cell>{clinicName(p.clinicId) ?? "—"}</Table.Cell>
                <Table.Cell justify="end">
                  <RowActions
                    label={providerFullName(p)}
                    onEdit={() => openEdit(p)}
                    onDelete={() => setDeleting(p)}
                  />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </AsyncContent>

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
