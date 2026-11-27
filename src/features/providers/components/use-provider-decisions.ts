"use client";

import { useMutation } from "@tanstack/react-query";
import { useNotify } from "@/components/notifications";
import { getErrorMessage } from "@/lib/errors";
import { PROVIDER_KEYS } from "@/lib/query-client";
import { rejectProvider, verifyProvider } from "../api";
import type { Provider } from "../schemas";
import { providerFullName } from "../utils";

export type Decision = "verify" | "reject";

const DECISION_VERB: Record<Decision, string> = {
  verify: "verified",
  reject: "rejected",
};

const decisionRequest = (decision: Decision, id: string) =>
  decision === "verify" ? verifyProvider(id) : rejectProvider(id);

export function useProviderDecisions() {
  const { notifyError, notifySuccess } = useNotify();

  const single = useMutation({
    meta: { invalidates: PROVIDER_KEYS },
    mutationFn: ({
      provider,
      decision,
    }: {
      provider: Provider;
      decision: Decision;
    }) => decisionRequest(decision, provider.id),
    onSuccess: (_, { provider, decision }) =>
      notifySuccess(`${providerFullName(provider)} ${DECISION_VERB[decision]}`),
    onError: (e, { provider, decision }) =>
      notifyError(
        `Could not ${decision} ${providerFullName(provider)}: ${getErrorMessage(e)}`,
      ),
  });

  const bulk = useMutation({
    meta: { invalidates: PROVIDER_KEYS },
    mutationFn: async ({
      decision,
      targets,
    }: {
      decision: Decision;
      targets: Provider[];
    }) => {
      let failed = 0;
      for (const provider of targets) {
        try {
          await decisionRequest(decision, provider.id);
        } catch {
          failed++;
        }
      }
      return { decision, done: targets.length - failed, failed };
    },
    onSuccess: ({ decision, done, failed }) => {
      const summary = `${done} ${DECISION_VERB[decision]}${failed ? `, ${failed} failed` : ""}`;
      if (failed > 0) notifyError(summary);
      else notifySuccess(summary);
    },
  });

  const decide = (provider: Provider, decision: Decision) =>
    single.mutate({ provider, decision });

  return { decide, bulk };
}
