"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useNotify } from "@/components/notifications";
import type { VerificationStatus } from "@/features/auth/schemas";
import {
  fetchClinicProviders,
  rejectProvider,
  verifyProvider,
} from "@/features/providers/api";
import type { Provider } from "@/features/providers/schemas";
import { providerFullName } from "@/features/providers/utils";
import { getErrorMessage } from "@/lib/errors";
import { PROVIDER_KEYS } from "@/lib/query-client";

const statusOf = (p: Provider): VerificationStatus =>
  p.verificationStatus ?? "PENDING";

type Decision = "admit" | "decline";

export function useClinicDoctors(clinicId: string | null) {
  const { notifyError, notifySuccess } = useNotify();
  const query = useQuery({
    queryKey: ["providers", "clinic", clinicId ?? ""],
    queryFn: () => (clinicId ? fetchClinicProviders(clinicId) : []),
  });
  const doctors = query.data ?? [];

  const decide = useMutation({
    meta: { invalidates: PROVIDER_KEYS },
    mutationFn: ({ row, decision }: { row: Provider; decision: Decision }) =>
      decision === "admit" ? verifyProvider(row.id) : rejectProvider(row.id),
    onSuccess: (_, { row, decision }) =>
      notifySuccess(
        `${providerFullName(row)} ${decision === "admit" ? "admitted" : "declined"}`,
      ),
    onError: (e, { row, decision }) =>
      notifyError(
        `Could not ${decision} ${providerFullName(row)}: ${getErrorMessage(e)}`,
      ),
  });

  return {
    doctors,
    byStatus: (status: VerificationStatus) =>
      doctors.filter((p) => statusOf(p) === status),
    loading: query.isPending,
    error: query.error ? getErrorMessage(query.error) : null,
    reload: () => void query.refetch(),
    verify: (row: Provider) => decide.mutate({ row, decision: "admit" }),
    reject: (row: Provider) => decide.mutate({ row, decision: "decline" }),
  };
}
