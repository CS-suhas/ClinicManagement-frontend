"use client";

import { Button, Flex, Tabs } from "@radix-ui/themes";
import { useMemo, useState } from "react";
import { hasRole } from "@/application/auth/permissions";
import { useService } from "@/di/container-provider";
import {
  CLINIC_JOIN_STATUSES,
  type Clinic,
  type ClinicJoinRequest,
  type ClinicJoinStatus,
} from "@/domain/entities";
import { useAuth } from "@/presentation/auth/auth-provider";
import { AsyncContent } from "@/presentation/components/async-content";
import { type Column, DataTable } from "@/presentation/components/data-table";
import { SelectFormField } from "@/presentation/components/form-fields";
import {
  ClinicChip,
  DoctorChip,
  StatusChip,
} from "@/presentation/components/glance";
import { EmptyState } from "@/presentation/components/ui/empty-state";
import { PageHeader } from "@/presentation/components/ui/page-header";
import { RelativeTime } from "@/presentation/components/ui/relative-time";
import { TableSkeleton } from "@/presentation/components/ui/table-skeleton";
import { useAsyncData } from "@/presentation/hooks/use-async-data";
import { useClinicJoinRequests } from "./use-clinic-join-requests";

const STATUS_LABELS: Record<ClinicJoinStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

/** Splits the API's full provider name into the first and last names a chip needs. */
export function splitProviderName(name: string): {
  firstName: string;
  lastName: string;
} {
  const [firstName = "", ...rest] = name.trim().split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
}

/**
 * Verified doctors asking to move to a clinic from the one they are at. A
 * clinic admin sees the clinics they administer (with a picker when there are
 * several); a platform admin picks any clinic. Approving a request moves the
 * doctor to that clinic.
 */
export function JoinRequestsView() {
  const clinicService = useService("clinicService");
  const { user } = useAuth();
  const isAdmin = hasRole(user, "admin");
  const adminOf = user?.clinicAdminOf ?? [];

  const clinicsState = useAsyncData<Clinic[]>(() => clinicService.list());
  const clinics = clinicsState.data ?? [];
  const options = useMemo(
    () =>
      (isAdmin
        ? clinics
        : clinics.filter((clinic) => adminOf.includes(clinic.id))
      ).map((clinic) => ({ value: clinic.id, label: clinic.name })),
    [clinics, isAdmin, adminOf],
  );

  const [picked, setPicked] = useState<string | null>(null);
  const [status, setStatus] = useState<ClinicJoinStatus>("PENDING");
  const clinicId = picked ?? options[0]?.value ?? null;
  const clinicName = options.find((o) => o.value === clinicId)?.label ?? "";

  const queue = useClinicJoinRequests(clinicId, status);
  const pending = status === "PENDING";

  const columns: Column<ClinicJoinRequest>[] = [
    {
      header: "Doctor",
      cell: (r) => (
        <DoctorChip
          provider={{
            id: r.providerId,
            ...splitProviderName(r.providerName),
            specialty: r.providerSpecialty,
            clinicId: r.clinicId,
            clinicName: r.clinicName,
          }}
        />
      ),
    },
    {
      header: "Clinic",
      cell: (r) => (
        <ClinicChip clinic={{ id: r.clinicId, name: r.clinicName }} />
      ),
      hideBelow: "md",
    },
    {
      header: "Status",
      cell: (r) => (
        <StatusChip kind="joinRequest" status={r.status} interactive={false} />
      ),
    },
    {
      header: "Requested",
      cell: (r) => <RelativeTime iso={r.createdAtUtc} style="long" />,
      hideBelow: "md",
    },
  ];

  const rowActions = (r: ClinicJoinRequest) =>
    r.status === "PENDING" ? (
      <Flex gap="2" justify="end">
        <Button
          size="1"
          color="teal"
          aria-label={`Approve ${r.providerName}`}
          onClick={() => queue.approve(r)}
        >
          Approve
        </Button>
        <Button
          size="1"
          variant="soft"
          color="red"
          aria-label={`Reject ${r.providerName}`}
          onClick={() => queue.reject(r)}
        >
          Reject
        </Button>
      </Flex>
    ) : null;

  const noClinics = !clinicsState.loading && options.length === 0;

  return (
    <>
      <PageHeader
        title="Join requests"
        subtitle={
          clinicName
            ? `Doctors at other clinics asking to move to ${clinicName}. Approving moves them here.`
            : "Doctors at other clinics asking to move. Approving moves them to the requested clinic."
        }
        actions={
          options.length > 1 ? (
            <div className="w-64">
              <SelectFormField
                label="Clinic"
                id="join-clinic"
                value={clinicId ?? ""}
                onValueChange={setPicked}
                options={options}
              />
            </div>
          ) : undefined
        }
      />

      {noClinics ? (
        <EmptyState
          title="No clinic to manage"
          description="You do not administer a clinic yet. An administrator can add you to one."
        />
      ) : (
        <Tabs.Root
          value={status}
          onValueChange={(value) => setStatus(value as ClinicJoinStatus)}
        >
          <Tabs.List aria-label="Request status" className="mb-4">
            {CLINIC_JOIN_STATUSES.map((value) => (
              <Tabs.Trigger key={value} value={value}>
                {STATUS_LABELS[value]}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value={status}>
            <AsyncContent
              loading={queue.loading || clinicsState.loading}
              error={queue.error ?? clinicsState.error}
              isEmpty={queue.requests.length === 0}
              onRetry={() => void queue.reload()}
              skeleton={
                <TableSkeleton
                  columns={["chip", "chip", "short", "text"]}
                  rows={4}
                />
              }
              empty={
                <EmptyState
                  title={
                    pending
                      ? "No requests waiting"
                      : `No ${STATUS_LABELS[status].toLowerCase()} requests`
                  }
                  description={
                    pending
                      ? "Doctors who ask to move to this clinic appear here."
                      : "Requests with this status show up here."
                  }
                />
              }
            >
              <DataTable
                columns={columns}
                rows={queue.requests}
                rowLabel={(r) => r.providerName}
                rowActions={rowActions}
                caption={`${STATUS_LABELS[status]} join requests`}
              />
            </AsyncContent>
          </Tabs.Content>
        </Tabs.Root>
      )}
    </>
  );
}
