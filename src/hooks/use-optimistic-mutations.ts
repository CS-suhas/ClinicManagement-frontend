"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { useNotify } from "@/components/notifications";
import { ConflictError, ValidationError } from "@/domain/errors";
import { ApiError } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { invalidateGlanceData } from "./use-glance-data";

export const UNDO_WINDOW_MS = 5000;

export type OptimisticMutation = {
  apply: () => void;
  rollback: () => void;
  request: () => Promise<unknown>;
  failureMessage: string;
  successMessage?: string;
  undo?: { delayMs?: number };
};

function failureText(failureMessage: string, e: unknown) {
  if (e instanceof ConflictError) return e.message;
  if (e instanceof ApiError && e.status === 409) return e.message;
  if (e instanceof ApiError && e.fieldErrors)
    return `${failureMessage}: ${Object.values(e.fieldErrors).join(" ")}`;
  if (e instanceof ValidationError)
    return `${failureMessage}: ${Object.values(e.fieldErrors).join(" ")}`;
  return `${failureMessage}: ${getErrorMessage(e)}`;
}

function createHold(ms: number) {
  let settle: (committed: boolean) => void = () => {};
  const promise = new Promise<boolean>((resolve) => {
    settle = resolve;
  });
  const timer = setTimeout(() => settle(true), ms);
  return {
    promise,
    cancel: () => {
      clearTimeout(timer);
      settle(false);
    },
  };
}

export function useOptimisticMutations(onIdle: () => void = () => {}) {
  const { notifyError, notifySuccess } = useNotify();
  const queryClient = useQueryClient();
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  return useCallback(
    ({
      apply,
      rollback,
      request,
      failureMessage,
      successMessage,
      undo,
    }: OptimisticMutation) => {
      apply();
      pending.current++;
      const hold = undo ? createHold(undo.delayMs ?? UNDO_WINDOW_MS) : null;
      if (hold && successMessage) {
        notifySuccess(successMessage, {
          undo: () => {
            hold.cancel();
          },
          durationMs: undo?.delayMs ?? UNDO_WINDOW_MS,
        });
      }
      queue.current = queue.current.then(async () => {
        try {
          if (hold && !(await hold.promise)) {
            rollback();
            return;
          }
          await request();
          if (!hold && successMessage) notifySuccess(successMessage);
        } catch (e) {
          rollback();
          notifyError(failureText(failureMessage, e));
        } finally {
          pending.current--;
          invalidateGlanceData();
          if (pending.current === 0) {
            void queryClient.invalidateQueries();
            onIdleRef.current();
          }
        }
      });
    },
    [notifyError, notifySuccess, queryClient],
  );
}
