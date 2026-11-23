"use client";

import { useCallback, useRef } from "react";
import { useNotify } from "../components/notifications";
import { getErrorMessage } from "../lib/errors";

export interface OptimisticMutation {
  /** Shows the expected result in the UI right away. */
  apply: () => void;
  /** Puts the UI back as it was if the request fails. */
  rollback: () => void;
  /** The real request; runs in the background after `apply`. */
  request: () => Promise<unknown>;
  /** Start of the failure popup, e.g. "Could not delete clinic". */
  failureMessage: string;
}

/**
 * Runs mutations in the background after updating the UI optimistically.
 * Requests run one at a time in the order issued (so an edit never overtakes
 * the create it depends on); a failure rolls back and shows a popup. `onIdle`
 * runs when no request is left, to reconcile the UI with the server.
 */
export function useOptimisticMutations(onIdle: () => void) {
  const { notifyError } = useNotify();
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  return useCallback(
    ({ apply, rollback, request, failureMessage }: OptimisticMutation) => {
      apply();
      pending.current++;
      queue.current = queue.current.then(async () => {
        try {
          await request();
        } catch (e) {
          rollback();
          notifyError(`${failureMessage}: ${getErrorMessage(e)}`);
        } finally {
          pending.current--;
          if (pending.current === 0) onIdleRef.current();
        }
      });
    },
    [notifyError],
  );
}
