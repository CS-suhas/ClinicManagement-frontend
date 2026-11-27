"use client";

import { useNotify } from "@/components/notifications";
import { useService } from "@/di/container-provider";
import { type Provider, providerFullName } from "@/domain/entities";
import { announceCountsChanged } from "@/features/notification-bell/components/use-my-dashboard";
import { useAsyncData } from "@/hooks/use-async-data";
import { useOptimisticMutations } from "@/hooks/use-optimistic-mutations";

export type ApprovalTab = "PENDING" | "REJECTED" | "VERIFIED";

/** The queue shows one page of applications; the admin list is small in practice. */
const QUEUE_PAGE_SIZE = 100;

/**
 * The doctor-approval queue for one status tab. Approve and reject update the
 * list at once and send the request in the background; a failure puts the row
 * back and shows a popup. Reject can be undone for a few seconds.
 */
export function useDoctorApprovals(tab: ApprovalTab, search: string) {
  const providerService = useService("providerService");
  const { notifyError, notifySuccess } = useNotify();
  const { data, loading, error, reload, refresh, mutate } = useAsyncData<
    Provider[]
  >(
    async () =>
      (
        await providerService.searchByStatus({
          verificationStatus: tab,
          search: search || undefined,
          page: 1,
          pageSize: QUEUE_PAGE_SIZE,
        })
      ).items,
    `${tab}|${search}`,
  );
  const providers = data ?? [];

  const runOptimistic = useOptimisticMutations(() => {
    void refresh();
    announceCountsChanged();
  });

  const removeRow = (id: string) =>
    mutate((current) => current?.filter((p) => p.id !== id));

  const restoreRow = (row: Provider, index: number) =>
    mutate((current) => {
      if (!current) return current;
      const next = current.filter((p) => p.id !== row.id);
      next.splice(Math.max(0, Math.min(index, next.length)), 0, row);
      return next;
    });

  const verify = (row: Provider) => {
    const index = providers.findIndex((p) => p.id === row.id);
    const name = providerFullName(row);
    runOptimistic({
      apply: () => removeRow(row.id),
      rollback: () => restoreRow(row, index),
      request: () => providerService.verify(row.id),
      failureMessage: `Could not verify ${name}`,
      successMessage: `${name} verified`,
    });
  };

  const reject = (row: Provider) => {
    const index = providers.findIndex((p) => p.id === row.id);
    const name = providerFullName(row);
    runOptimistic({
      apply: () => removeRow(row.id),
      rollback: () => restoreRow(row, index),
      request: () => providerService.reject(row.id),
      failureMessage: `Could not reject ${name}`,
      successMessage: `${name} rejected`,
      undo: {},
    });
  };

  /** Verifies the rows one by one. Failures go back into the list and are named in a popup. */
  const verifyMany = async (rows: Provider[], clear: () => void) => {
    const ids = new Set(rows.map((r) => r.id));
    mutate((current) => current?.filter((p) => !ids.has(p.id)));
    clear();
    const failed: Provider[] = [];
    let verified = 0;
    for (const row of rows) {
      try {
        await providerService.verify(row.id);
        verified++;
      } catch {
        failed.push(row);
      }
    }
    if (failed.length > 0) {
      mutate((current) => (current ? [...current, ...failed] : current));
      notifyError(
        `Could not verify ${failed.map(providerFullName).join(", ")}`,
      );
    }
    if (verified > 0)
      notifySuccess(
        failed.length > 0
          ? `${verified} verified, ${failed.length} failed`
          : `${verified} verified`,
      );
    void refresh();
    announceCountsChanged();
  };

  return {
    providers,
    loading,
    error,
    reload,
    verify,
    reject,
    verifyMany,
  };
}
