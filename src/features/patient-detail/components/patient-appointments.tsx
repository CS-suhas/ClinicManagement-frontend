"use client";

import { Text } from "@radix-ui/themes";
import { AsyncContent } from "@/components/async-content";
import { type Column, DataTable } from "@/components/data-table";
import { StatusChip } from "@/components/glance";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import type { AppointmentListItem } from "@/features/patients/schemas";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { usePatientAppointments } from "../api";

export function PatientAppointments({
  patientId,
  scopeProviderId,
}: {
  patientId: string;
  scopeProviderId: string | null;
}) {
  const list = usePatientAppointments(patientId, scopeProviderId);

  const columns: Column<AppointmentListItem>[] = [
    {
      header: "When",
      cell: (a) => (
        <Text size="2" style={{ color: "var(--mp-ink)" }}>
          {formatDateTime(a.appointmentDateTime)}
        </Text>
      ),
    },
    {
      header: "Doctor",
      cell: (a) => a.providerName,
      hideBelow: "sm",
    },
    {
      header: "Reason",
      cell: (a) => a.reasonForVisit ?? "—",
      hideBelow: "md",
    },
    {
      header: "Status",
      cell: (a) => (
        <StatusChip kind="appointment" status={a.status} interactive={false} />
      ),
    },
  ];

  return (
    <AsyncContent
      loading={list.isPending}
      error={list.error ? getErrorMessage(list.error) : null}
      isEmpty={(list.data ?? []).length === 0}
      onRetry={() => void list.refetch()}
      skeleton={
        <TableSkeleton columns={["text", "chip", "text", "short"]} rows={4} />
      }
      empty={
        <EmptyState
          title="No appointments yet"
          description="Visits booked with this patient show up here."
        />
      }
    >
      <DataTable
        columns={columns}
        rows={list.data ?? []}
        rowLabel={(a) => formatDateTime(a.appointmentDateTime)}
        caption="Appointments"
      />
    </AsyncContent>
  );
}
