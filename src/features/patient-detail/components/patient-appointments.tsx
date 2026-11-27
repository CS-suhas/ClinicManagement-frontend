"use client";

import { Text } from "@radix-ui/themes";
import { AsyncContent } from "@/components/async-content";
import { type Column, DataTable } from "@/components/data-table";
import { StatusChip } from "@/components/glance";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useService } from "@/di/container-provider";
import type { AppointmentListItem } from "@/domain/repositories";
import { useAsyncData } from "@/hooks/use-async-data";
import { formatDateTime } from "@/lib/format";

const APPOINTMENT_PAGE_SIZE = 50;

/**
 * Appointments tab. Lists the patient's visits, newest first. A doctor sees only
 * their own visits with the patient (`scopeProviderId`).
 */
export function PatientAppointments({
  patientId,
  scopeProviderId,
}: {
  patientId: string;
  scopeProviderId: string | null;
}) {
  const appointmentService = useService("appointmentService");
  const list = useAsyncData<AppointmentListItem[]>(
    () =>
      appointmentService
        .search({
          patientId,
          providerId: scopeProviderId ?? undefined,
          page: 1,
          pageSize: APPOINTMENT_PAGE_SIZE,
        })
        .then((result) =>
          [...result.items].sort(
            (a, b) =>
              Date.parse(b.appointmentDateTime) -
              Date.parse(a.appointmentDateTime),
          ),
        ),
    `${patientId}|${scopeProviderId ?? ""}`,
  );

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
      loading={list.loading}
      error={list.error}
      isEmpty={(list.data ?? []).length === 0}
      onRetry={() => void list.reload()}
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
