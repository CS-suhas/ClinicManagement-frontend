"use client";

import { useMutation } from "@tanstack/react-query";
import { useNotify } from "@/components/notifications";
import { useOptimisticMutations } from "@/hooks/use-optimistic-mutations";
import { PROVIDER_KEYS } from "@/lib/query-client";
import { rejectProvider, usePatchProviderLists, verifyProvider } from "../api";
import type { Provider } from "../schemas";
import { providerFullName } from "../utils";

export type Decision = "verify" | "reject";

const DECISION_VERB: Record<Decision, string> = {
  verify: "verified",
  reject: "rejected",
};

const DECISION_STATUS = {
  verify: "VERIFIED",
  reject: "REJECTED",
} as const;

const decisionRequest = (decision: Decision, id: string) =>
  decision === "verify" ? verifyProvider(id) : rejectProvider(id);

export function useProviderDecisions() {
  const { notifyError, notifySuccess } = useNotify();
  const runOptimistic = useOptimisticMutations(PROVIDER_KEYS);
  const patch = usePatchProviderLists();

  const decide = (provider: Provider, decision: Decision) => {
    const name = providerFullName(provider);
    const previous = provider.verificationStatus;
    runOptimistic({
      apply: () =>
        patch(provider.id, { verificationStatus: DECISION_STATUS[decision] }),
      rollback: () => patch(provider.id, { verificationStatus: previous }),
      request: () => decisionRequest(decision, provider.id),
      failureMessage: `Could not ${decision === "verify" ? "verify" : "reject"} ${name}`,
      successMessage: `${name} ${DECISION_VERB[decision]}`,
    });
  };

  const bulk = useMutation({
    meta: { invalidates: PROVIDER_KEYS },
    mutationFn: async ({
      decision,
      targets,
    }: {
      decision: Decision;
      targets: Provider[];
    }) => {
      let done = 0;
      let failed = 0;
      for (const provider of targets) {
        try {
          await decisionRequest(decision, provider.id);
          patch(provider.id, {
            verificationStatus: DECISION_STATUS[decision],
          });
          done++;
        } catch {
          failed++;
        }
      }
      return { decision, done, failed };
    },
    onSuccess: ({ decision, done, failed }) => {
      const summary = `${done} ${DECISION_VERB[decision]}${failed ? `, ${failed} failed` : ""}`;
      if (failed > 0) notifyError(summary);
      else notifySuccess(summary);
    },
  });

  return { decide, bulk };
}
