"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { VerificationStatus } from "@/features/auth/schemas";
import { announceCountsChanged } from "@/features/notification-bell/components/use-my-dashboard";
import {
  fetchClinicProviders,
  rejectProvider,
  verifyProvider,
} from "@/features/providers/api";
import type { Provider } from "@/features/providers/schemas";
import { providerFullName } from "@/features/providers/utils";
import { useOptimisticMutations } from "@/hooks/use-optimistic-mutations";
import { getErrorMessage } from "@/lib/errors";

const statusOf = (p: Provider): VerificationStatus =>
  p.verificationStatus ?? "PENDING";

export function useClinicDoctors(clinicId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ["providers", "clinic", clinicId ?? ""];
  const query = useQuery({
    queryKey,
    queryFn: () => (clinicId ? fetchClinicProviders(clinicId) : []),
  });
  const doctors = query.data ?? [];

  const runOptimistic = useOptimisticMutations();

  const setStatus = (id: string, status: VerificationStatus) =>
    queryClient.setQueryData<Provider[]>(queryKey, (current) =>
      current?.map((p) =>
        p.id === id ? { ...p, verificationStatus: status } : p,
      ),
    );

  const verify = (row: Provider) => {
    const name = providerFullName(row);
    const before = statusOf(row);
    runOptimistic({
      apply: () => setStatus(row.id, "VERIFIED"),
      rollback: () => setStatus(row.id, before),
      request: () => verifyProvider(row.id).finally(announceCountsChanged),
      failureMessage: `Could not admit ${name}`,
      successMessage: `${name} admitted`,
    });
  };

  const reject = (row: Provider) => {
    const name = providerFullName(row);
    runOptimistic({
      apply: () => setStatus(row.id, "REJECTED"),
      rollback: () => setStatus(row.id, "PENDING"),
      request: () => rejectProvider(row.id).finally(announceCountsChanged),
      failureMessage: `Could not decline ${name}`,
      successMessage: `${name} declined`,
      undo: {},
    });
  };

  const byStatus = (status: VerificationStatus) =>
    doctors.filter((p) => statusOf(p) === status);

  return {
    doctors,
    byStatus,
    loading: query.isPending,
    error: query.error ? getErrorMessage(query.error) : null,
    reload: () => void query.refetch(),
    verify,
    reject,
  };
}
