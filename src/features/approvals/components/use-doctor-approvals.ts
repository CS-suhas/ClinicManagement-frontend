"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNotify } from "@/components/notifications";
import type { VerificationStatus } from "@/features/auth/schemas";
import {
  rejectProvider,
  searchProvidersByStatus,
  verifyProvider,
} from "@/features/providers/api";
import type { Provider } from "@/features/providers/schemas";
import { providerFullName } from "@/features/providers/utils";
import { useOptimisticMutations } from "@/hooks/use-optimistic-mutations";
import { getErrorMessage } from "@/lib/errors";
import { invalidate, PROVIDER_KEYS } from "@/lib/query-client";

export type ApprovalTab = VerificationStatus;

export function useDoctorApprovals(tab: ApprovalTab, search: string) {
  const queryClient = useQueryClient();
  const { notifyError, notifySuccess } = useNotify();
  const queryKey = ["providers", "verification", tab, search];
  const query = useQuery({
    queryKey,
    queryFn: async () =>
      (await searchProvidersByStatus(tab, search || undefined)).items,
  });
  const providers = query.data ?? [];

  const runOptimistic = useOptimisticMutations(PROVIDER_KEYS);

  const mutateRows = (change: (rows: Provider[]) => Provider[]) =>
    queryClient.setQueryData<Provider[]>(queryKey, (current) =>
      current ? change(current) : current,
    );

  const removeRow = (id: string) =>
    mutateRows((current) => current.filter((p) => p.id !== id));

  const restoreRow = (row: Provider, index: number) =>
    mutateRows((current) => {
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
      request: () => verifyProvider(row.id),
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
      request: () => rejectProvider(row.id),
      failureMessage: `Could not reject ${name}`,
      successMessage: `${name} rejected`,
      undo: {},
    });
  };

  const verifyMany = async (rows: Provider[], clear: () => void) => {
    const ids = new Set(rows.map((r) => r.id));
    mutateRows((current) => current.filter((p) => !ids.has(p.id)));
    clear();
    const failed: Provider[] = [];
    let verified = 0;
    for (const row of rows) {
      try {
        await verifyProvider(row.id);
        verified++;
      } catch {
        failed.push(row);
      }
    }
    if (failed.length > 0) {
      mutateRows((current) => [...current, ...failed]);
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
    void invalidate(queryClient, PROVIDER_KEYS);
  };

  return {
    providers,
    loading: query.isPending,
    error: query.error ? getErrorMessage(query.error) : null,
    reload: () => void query.refetch(),
    verify,
    reject,
    verifyMany,
  };
}
