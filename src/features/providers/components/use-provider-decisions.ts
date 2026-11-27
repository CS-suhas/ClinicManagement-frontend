"use client";

import { useMutation } from "@tanstack/react-query";
import { notify } from "@/components/notifications";
import { getErrorMessage } from "@/lib/errors";
import { PROVIDER_CHANGES } from "@/lib/query-client";
import { type Decision, decideProvider } from "../api";
import type { Provider } from "../schemas";
import { providerFullName } from "../utils";

export type { Decision };

const DECISION_VERB: Record<Decision, string> = {
  verify: "verified",
  reject: "rejected",
};

type DecisionTarget = Pick<Provider, "id" | "firstName" | "lastName">;

export function useProviderDecisions() {
  const single = useMutation({
    meta: { invalidates: PROVIDER_CHANGES },
    mutationFn: ({
      provider,
      decision,
    }: {
      provider: DecisionTarget;
      decision: Decision;
    }) => decideProvider(provider.id, decision),
    onSuccess: (_, { provider, decision }) =>
      notify.success(
        `${providerFullName(provider)} ${DECISION_VERB[decision]}`,
      ),
    onError: (e, { provider, decision }) =>
      notify.error(
        `Could not ${decision} ${providerFullName(provider)}: ${getErrorMessage(e)}`,
      ),
  });

  const bulk = useMutation({
    meta: { invalidates: PROVIDER_CHANGES },
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
          await decideProvider(provider.id, decision);
        } catch {
          failed++;
        }
      }
      return { decision, done: targets.length - failed, failed };
    },
    onSuccess: ({ decision, done, failed }) => {
      const summary = `${done} ${DECISION_VERB[decision]}${failed ? `, ${failed} failed` : ""}`;
      if (failed > 0) notify.error(summary);
      else notify.success(summary);
    },
  });

  const decide = (provider: DecisionTarget, decision: Decision) =>
    single.mutate({ provider, decision });

  return { decide, deciding: single.isPending, bulk };
}
