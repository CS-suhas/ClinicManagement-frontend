"use client";

import { Flex, SegmentedControl, Text } from "@radix-ui/themes";
import { useState } from "react";
import { useService } from "@/di/container-provider";
import type { AppointmentListItem } from "@/domain/repositories";
import { ConfirmDeleteDialog } from "@/presentation/components/confirm-delete-dialog";
import { type Column, DataTable } from "@/presentation/components/data-table";
import { ListPage } from "@/presentation/components/list-page";
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

const time = (a: AppointmentListItem) =>
  new Date(a.appointmentDateTime).getTime();

/** Soonest first, except the "past" range which lists most recent first. */
function sortByDate(items: AppointmentListItem[], range: Range) {
  return [...items].sort((a, b) =>
    range === "past" ? time(b) - time(a) : time(a) - time(b),
  );
}

function emptyText(range: Range, query: string) {
  if (query) return "No appointments match your search.";
  return range === "all" ? "No appointments yet." : `No ${range} appointments.`;
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
  const [range, setRange] = useState<Range>("upcoming");
  const crud = useCrudPage(useService("appointmentService"), {
    entityName: "appointment",
    extraOptions: () => rangeOptions(range),
    extraKey: range,
  });

  return (
    <>
      <ListPage
        title="Appointments"
        description="Scheduled visits between patients and providers."
        entity="appointment"
        entityPlural="appointments"
        list={crud}
        pageSize={PAGE_SIZE}
        onCreate={crud.form.openCreate}
        createDisabled={crud.loading || !crud.data}
        emptyText={emptyText(range, crud.query)}
        filters={
          <SegmentedControl.Root
            value={range}
            onValueChange={(v) => {
              setRange(v as Range);
              crud.setPage(1);
            }}
          >
            <SegmentedControl.Item value="upcoming">
              Upcoming
            </SegmentedControl.Item>
            <SegmentedControl.Item value="past">Past</SegmentedControl.Item>
            <SegmentedControl.Item value="all">All</SegmentedControl.Item>
          </SegmentedControl.Root>
        }
      >
        <DataTable
          columns={columns}
          rows={sortByDate(crud.rows, range)}
          rowLabel={(a) => `appointment for ${a.patientName}`}
          onEdit={crud.form.openEdit}
          onDelete={crud.setDeleting}
        />
      </ListPage>

      <AppointmentFormDialog
        open={crud.form.open}
        onOpenChange={crud.form.onOpenChange}
        appointment={crud.form.editing}
        onSave={crud.save}
      />
      <ConfirmDeleteDialog
        {...crud.deleteDialog}
        title="Delete appointment?"
        description={
          crud.deleting
            ? `The appointment for ${crud.deleting.patientName} on ${formatDateTime(crud.deleting.appointmentDateTime)} will be permanently removed. This cannot be undone.`
            : ""
        }
      />
    </>
  );
}
