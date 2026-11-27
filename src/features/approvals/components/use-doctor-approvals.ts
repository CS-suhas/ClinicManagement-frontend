"use client";

import { useMutation } from "@tanstack/react-query";
import { notify } from "@/components/notifications";
import type { VerificationStatus } from "@/features/auth/schemas";
import {
  type Decision,
  decideProvider,
  useProvidersByStatus,
} from "@/features/providers/api";
import type { Provider } from "@/features/providers/schemas";
import { providerFullName } from "@/features/providers/utils";
import { getErrorMessage } from "@/lib/errors";
import { PROVIDER_CHANGES } from "@/lib/query-client";

export type ApprovalTab = VerificationStatus;

export function useDoctorApprovals(tab: ApprovalTab, search: string) {
  const query = useProvidersByStatus(tab, search);

  const decide = useMutation({
    meta: { invalidates: PROVIDER_CHANGES },
    mutationFn: ({ row, decision }: { row: Provider; decision: Decision }) =>
      decideProvider(row.id, decision),
    onSuccess: (_, { row, decision }) =>
      notify.success(
        `${providerFullName(row)} ${decision === "verify" ? "verified" : "rejected"}`,
      ),
    onError: (e, { row, decision }) =>
      notify.error(
        `Could not ${decision} ${providerFullName(row)}: ${getErrorMessage(e)}`,
      ),
  });

  const verifyAll = useMutation({
    meta: { invalidates: PROVIDER_CHANGES },
    mutationFn: async (rows: Provider[]) => {
      const failed: Provider[] = [];
      for (const row of rows) {
        try {
          await decideProvider(row.id, "verify");
        } catch {
          failed.push(row);
        }
      }
      return { verified: rows.length - failed.length, failed };
    },
    onSuccess: ({ verified, failed }) => {
      if (failed.length > 0)
        notify.error(
          `Could not verify ${failed.map(providerFullName).join(", ")}`,
        );
      if (verified > 0)
        notify.success(
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
