"use client";

import { PlusIcon } from "@radix-ui/react-icons";
import { Button, Flex, SegmentedControl, Table, Text } from "@radix-ui/themes";
import { useState } from "react";
import { useService } from "@/di/container-provider";
import type { AppointmentListItem } from "@/domain/repositories";
import { AsyncContent } from "@/presentation/components/async-content";
import { ConfirmDeleteDialog } from "@/presentation/components/confirm-delete-dialog";
import { PageHeader } from "@/presentation/components/page-header";
import { PaginationControls } from "@/presentation/components/pagination-controls";
import { RowActions } from "@/presentation/components/row-actions";
import { SearchField } from "@/presentation/components/search-field";
import { AppointmentFormDialog } from "@/presentation/features/appointments/appointment-form-dialog";
import { useAsyncData } from "@/presentation/hooks/use-async-data";
import { usePagedSearch } from "@/presentation/hooks/use-paged-search";
import { formatDateTime } from "@/presentation/lib/format";

type Range = "upcoming" | "past" | "all";
const PAGE_SIZE = 20;

export default function Page() {
  const appointmentService = useService("appointmentService");
  const [range, setRange] = useState<Range>("upcoming");
  const { query, search, page, setQuery, setPage } = usePagedSearch();
  const { data, loading, error, reload } = useAsyncData(() => {
    const options = {
      search: search || undefined,
      page,
      pageSize: PAGE_SIZE,
      ...(range === "upcoming"
        ? { from: new Date().toISOString() }
        : range === "past"
          ? { to: new Date().toISOString() }
          : {}),
    };
    return appointmentService.search(options);
  }, `${search}|${range}|${page}`);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentListItem | null>(null);
  const [deleting, setDeleting] = useState<AppointmentListItem | null>(null);
  const time = (a: AppointmentListItem) =>
    new Date(a.appointmentDateTime).getTime();
  const rows = [...(data?.items ?? [])].sort((a, b) =>
    range === "past" ? time(b) - time(a) : time(a) - time(b),
  );

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (a: AppointmentListItem) => {
    setEditing(a);
    setFormOpen(true);
  };

  const emptyText = query
    ? "No appointments match your search."
    : range === "all"
      ? "No appointments yet."
      : `No ${range} appointments.`;

  return (
    <>
      <PageHeader
        title="Appointments"
        description="Scheduled visits between patients and providers."
        actions={
          <Button onClick={openCreate} disabled={loading || !data}>
            <PlusIcon /> New appointment
          </Button>
        }
      />
      <Flex mb="3" gap="3" wrap="wrap" align="center">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search appointments…"
        />
        <SegmentedControl.Root
          value={range}
          onValueChange={(v) => {
            setRange(v as Range);
            setPage(1);
          }}
        >
          <SegmentedControl.Item value="upcoming">
            Upcoming
          </SegmentedControl.Item>
          <SegmentedControl.Item value="past">Past</SegmentedControl.Item>
          <SegmentedControl.Item value="all">All</SegmentedControl.Item>
        </SegmentedControl.Root>
      </Flex>

      <AsyncContent
        loading={loading}
        error={error}
        isEmpty={rows.length === 0}
        emptyText={emptyText}
        onRetry={reload}
      >
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Date & time</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Patient</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Provider</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Reason</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell justify="end">
                Actions
              </Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((a) => {
              const patient = a.patientName;
              return (
                <Table.Row key={a.id} align="center">
                  <Table.RowHeaderCell>
                    {formatDateTime(a.appointmentDateTime)}
                  </Table.RowHeaderCell>
                  <Table.Cell>{patient}</Table.Cell>
                  <Table.Cell>
                    <Flex direction="column">
                      <Text>{a.providerName}</Text>
                      {a.clinicName && (
                        <Text size="1" color="gray">
                          {a.clinicName}
                        </Text>
                      )}
                    </Flex>
                  </Table.Cell>
                  <Table.Cell>{a.reasonForVisit}</Table.Cell>
                  <Table.Cell justify="end">
                    <RowActions
                      label={`appointment for ${patient}`}
                      onEdit={() => openEdit(a)}
                      onDelete={() => setDeleting(a)}
                    />
                  </Table.Cell>
                </Table.Row>
              );
            })}
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

      <AppointmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        appointment={editing}
        onSaved={reload}
      />
      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete appointment?"
        description={
          deleting
            ? `The appointment for ${deleting.patientName} on ${formatDateTime(deleting.appointmentDateTime)} will be permanently removed. This cannot be undone.`
            : ""
        }
        onConfirm={() => appointmentService.delete(deleting?.id ?? "")}
        onDeleted={reload}
      />
    </>
  );
}
