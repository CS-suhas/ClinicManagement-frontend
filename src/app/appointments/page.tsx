"use client";

import { PlusIcon } from "@radix-ui/react-icons";
import { Button, Flex, SegmentedControl, Text } from "@radix-ui/themes";
import { useState } from "react";
import { useService } from "@/di/container-provider";
import type { AppointmentListItem } from "@/domain/repositories";
import { AsyncContent } from "@/presentation/components/async-content";
import { ConfirmDeleteDialog } from "@/presentation/components/confirm-delete-dialog";
import { type Column, DataTable } from "@/presentation/components/data-table";
import { PageHeader } from "@/presentation/components/page-header";
import { PaginationControls } from "@/presentation/components/pagination-controls";
import { SearchField } from "@/presentation/components/search-field";
import { AppointmentFormDialog } from "@/presentation/features/appointments/appointment-form-dialog";
import { PAGE_SIZE, useCrudPage } from "@/presentation/hooks/use-crud-page";
import { formatDateTime } from "@/presentation/lib/format";

type Range = "upcoming" | "past" | "all";

function rangeOptions(range: Range) {
  const now = new Date().toISOString();
  if (range === "upcoming") return { from: now };
  if (range === "past") return { to: now };
  return {};
}

const columns: Column<AppointmentListItem>[] = [
  { header: "Date & time", cell: (a) => formatDateTime(a.appointmentDateTime) },
  { header: "Patient", cell: (a) => a.patientName },
  {
    header: "Provider",
    cell: (a) => (
      <Flex direction="column">
        <Text>{a.providerName}</Text>
        {a.clinicName && (
          <Text size="1" color="gray">
            {a.clinicName}
          </Text>
        )}
      </Flex>
    ),
  },
  { header: "Reason", cell: (a) => a.reasonForVisit },
];

export default function Page() {
  const appointmentService = useService("appointmentService");
  const [range, setRange] = useState<Range>("upcoming");
  const {
    query,
    page,
    setQuery,
    setPage,
    data,
    rows: items,
    loading,
    error,
    reload,
    form,
    deleting,
    setDeleting,
    confirmDelete,
  } = useCrudPage(appointmentService, {
    extraOptions: () => rangeOptions(range),
    extraKey: range,
  });
  const time = (a: AppointmentListItem) =>
    new Date(a.appointmentDateTime).getTime();
  const rows = [...items].sort((a, b) =>
    range === "past" ? time(b) - time(a) : time(a) - time(b),
  );

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
          <Button onClick={form.openCreate} disabled={loading || !data}>
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
        <DataTable
          columns={columns}
          rows={rows}
          rowLabel={(a) => `appointment for ${a.patientName}`}
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

      <AppointmentFormDialog
        open={form.open}
        onOpenChange={form.onOpenChange}
        appointment={form.editing}
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
        onConfirm={confirmDelete}
        onDeleted={reload}
      />
    </>
  );
}
