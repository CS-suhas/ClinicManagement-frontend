"use client";

import { useService } from "@/di/container-provider";
import type { ClinicJoinRequest, ClinicJoinStatus } from "@/domain/entities";
import { announceCountsChanged } from "@/presentation/features/notification-bell/use-my-dashboard";
import { useAsyncData } from "@/presentation/hooks/use-async-data";
import { useOptimisticMutations } from "@/presentation/hooks/use-optimistic-mutations";

/**
 * Join requests for one clinic and status. Approve and reject are optimistic,
 * and a reject can be undone for a few seconds. Only PENDING rows can be
 * decided, so the list drops a row once it is approved or rejected.
 */
export function useClinicJoinRequests(
  clinicId: string | null,
  status: ClinicJoinStatus,
) {
  const clinicJoinService = useService("clinicJoinService");
  const { data, loading, error, reload, refresh, mutate } = useAsyncData<
    ClinicJoinRequest[]
  >(
    () =>
      clinicId
        ? clinicJoinService.listForClinic(clinicId, status)
        : Promise.resolve([]),
    `${clinicId}|${status}`,
  );
  const requests = data ?? [];

  const runOptimistic = useOptimisticMutations(() => {
    void refresh();
    announceCountsChanged();
  });

  const removeRow = (id: string) =>
    mutate((current) => current?.filter((r) => r.id !== id));

  const restoreRow = (row: ClinicJoinRequest, index: number) =>
    mutate((current) => {
      if (!current) return current;
      const next = current.filter((r) => r.id !== row.id);
      next.splice(Math.max(0, Math.min(index, next.length)), 0, row);
      return next;
    });

  const approve = (row: ClinicJoinRequest) => {
    const index = requests.findIndex((r) => r.id === row.id);
    runOptimistic({
      apply: () => removeRow(row.id),
      rollback: () => restoreRow(row, index),
      request: () => clinicJoinService.approve(row.id),
      failureMessage: `Could not approve ${row.providerName}`,
      successMessage: `${row.providerName} moved to ${row.clinicName}`,
    });
  };

  const reject = (row: ClinicJoinRequest) => {
    const index = requests.findIndex((r) => r.id === row.id);
    runOptimistic({
      apply: () => removeRow(row.id),
      rollback: () => restoreRow(row, index),
      request: () => clinicJoinService.reject(row.id),
      failureMessage: `Could not reject ${row.providerName}`,
      successMessage: `Request from ${row.providerName} rejected`,
      undo: {},
    });
  };

  return { requests, loading, error, reload, approve, reject };
}
