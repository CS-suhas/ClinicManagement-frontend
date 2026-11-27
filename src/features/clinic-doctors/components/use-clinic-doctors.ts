"use client";

import { useMutation } from "@tanstack/react-query";
import { notify } from "@/components/notifications";
import type { VerificationStatus } from "@/features/auth/schemas";
import { decideProvider, useClinicProviders } from "@/features/providers/api";
import type { Provider } from "@/features/providers/schemas";
import { providerFullName } from "@/features/providers/utils";
import { getErrorMessage } from "@/lib/errors";
import { PROVIDER_CHANGES } from "@/lib/query-client";

const statusOf = (p: Provider): VerificationStatus =>
  p.verificationStatus ?? "PENDING";

type Decision = "admit" | "decline";

export function useClinicDoctors(clinicId: string | null) {
  const query = useClinicProviders(clinicId);
  const doctors = query.data ?? [];

  const decide = useMutation({
    meta: { invalidates: PROVIDER_CHANGES },
    mutationFn: ({ row, decision }: { row: Provider; decision: Decision }) =>
      decideProvider(row.id, decision === "admit" ? "verify" : "reject"),
    onSuccess: (_, { row, decision }) =>
      notify.success(
        `${providerFullName(row)} ${decision === "admit" ? "admitted" : "declined"}`,
      ),
    onError: (e, { row, decision }) =>
      notify.error(
        `Could not ${decision} ${providerFullName(row)}: ${getErrorMessage(e)}`,
      ),
  });

  return {
    doctors,
    byStatus: (status: VerificationStatus) =>
      doctors.filter((p) => statusOf(p) === status),
    loading: query.isLoading,
    error: query.error ? getErrorMessage(query.error) : null,
    reload: () => void query.refetch(),
    verify: (row: Provider) => decide.mutate({ row, decision: "admit" }),
    reject: (row: Provider) => decide.mutate({ row, decision: "decline" }),
  };
}
