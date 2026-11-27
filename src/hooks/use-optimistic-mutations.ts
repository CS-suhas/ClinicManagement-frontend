"use client";

import { useCallback, useRef } from "react";
import { useNotify } from "@/components/notifications";
import { ConflictError, ValidationError } from "@/domain/errors";
import { getErrorMessage } from "@/lib/errors";
import { invalidateGlanceData } from "./use-glance-data";

/** Window in which a reversible action (reject, cancel) can be undone. */
export const UNDO_WINDOW_MS = 5000;

export type OptimisticMutation = {
  /** Shows the expected result in the UI right away. */
  apply: () => void;
  /** Puts the UI back as it was if the request fails or is undone. */
  rollback: () => void;
  /** The real request; runs in the background after `apply`. */
  request: () => Promise<unknown>;
  /** Start of the failure popup, e.g. "Could not delete clinic". */
  failureMessage: string;
  /** Success toast text once the request is saved, e.g. "Clinic saved". */
  successMessage?: string;
  /**
   * Delay-commit, for actions whose inverse is not a simple status change
   * (reject, cancel). The success toast appears at once with an Undo button and
   * the request waits `delayMs` (default 5 s). Undo rolls back and never sends
   * the request. Accept and complete should not set this: they commit at once.
   */
  undo?: { delayMs?: number };
};

/** A failure already explains itself; other errors follow the headline. */
function failureText(failureMessage: string, e: unknown) {
  if (e instanceof ConflictError) return e.message;
  if (e instanceof ValidationError)
    return `${failureMessage}: ${Object.values(e.fieldErrors).join(" ")}`;
  return `${failureMessage}: ${getErrorMessage(e)}`;
}

/** A timer that resolves true when it elapses, or false when cancelled first. */
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

/**
 * Runs mutations in the background after updating the UI optimistically.
 * Requests run one at a time in the order issued (so an edit never overtakes
 * the create it depends on). A failure rolls back and shows a popup; success
 * can show a toast; undoable mutations hold their request (see `undo`). Every
 * settled mutation invalidates the glance cache. `onIdle` runs when no request
 * is left, to reconcile the UI with the server.
 */
export function useOptimisticMutations(onIdle: () => void) {
  const { notifyError, notifySuccess } = useNotify();
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
          if (pending.current === 0) onIdleRef.current();
        }
      });
    },
    [notifyError, notifySuccess],
  );
}
