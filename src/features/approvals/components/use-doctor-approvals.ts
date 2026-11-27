"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useNotify } from "@/components/notifications";
import type { VerificationStatus } from "@/features/auth/schemas";
import {
  rejectProvider,
  searchProvidersByStatus,
  verifyProvider,
} from "@/features/providers/api";
import type { Provider } from "@/features/providers/schemas";
import { providerFullName } from "@/features/providers/utils";
import { getErrorMessage } from "@/lib/errors";
import { PROVIDER_KEYS } from "@/lib/query-client";

export type ApprovalTab = VerificationStatus;

type Decision = "verify" | "reject";

export function useDoctorApprovals(tab: ApprovalTab, search: string) {
  const { notifyError, notifySuccess } = useNotify();
  const query = useQuery({
    queryKey: ["providers", "verification", tab, search],
    queryFn: async () =>
      (await searchProvidersByStatus(tab, search || undefined)).items,
  });

  const decide = useMutation({
    meta: { invalidates: PROVIDER_KEYS },
    mutationFn: ({ row, decision }: { row: Provider; decision: Decision }) =>
      decision === "verify" ? verifyProvider(row.id) : rejectProvider(row.id),
    onSuccess: (_, { row, decision }) =>
      notifySuccess(
        `${providerFullName(row)} ${decision === "verify" ? "verified" : "rejected"}`,
      ),
    onError: (e, { row, decision }) =>
      notifyError(
        `Could not ${decision} ${providerFullName(row)}: ${getErrorMessage(e)}`,
      ),
  });

  const verifyAll = useMutation({
    meta: { invalidates: PROVIDER_KEYS },
    mutationFn: async (rows: Provider[]) => {
      const failed: Provider[] = [];
      for (const row of rows) {
        try {
          await verifyProvider(row.id);
        } catch {
          failed.push(row);
        }
      }
      return { verified: rows.length - failed.length, failed };
    },
    onSuccess: ({ verified, failed }) => {
      if (failed.length > 0)
        notifyError(
          `Could not verify ${failed.map(providerFullName).join(", ")}`,
        );
      if (verified > 0)
        notifySuccess(
          failed.length > 0
            ? `${verified} verified, ${failed.length} failed`
            : `${verified} verified`,
        );
    },
  });

  return {
    providers: query.data ?? [],
    loading: query.isPending,
    error: query.error ? getErrorMessage(query.error) : null,
    reload: () => void query.refetch(),
    verify: (row: Provider) => decide.mutate({ row, decision: "verify" }),
    reject: (row: Provider) => decide.mutate({ row, decision: "reject" }),
    verifyMany: async (rows: Provider[], clear: () => void) => {
      clear();
      await verifyAll.mutateAsync(rows);
    },
  };
}
