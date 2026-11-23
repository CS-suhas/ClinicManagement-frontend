"use client";

import { useService } from "@/di/container-provider";
import {
  type AppointmentAction,
  nextAppointmentStatus,
} from "@/domain/entities";
import type { AppointmentListItem } from "@/domain/repositories";
import { useOptimisticMutations } from "@/presentation/hooks/use-optimistic-mutations";

export const ACTION_LABEL: Record<AppointmentAction, string> = {
  confirm: "Accept",
  decline: "Reject",
  complete: "Complete",
  cancel: "Cancel visit",
};

const SUCCESS: Record<AppointmentAction, string> = {
  confirm: "Appointment accepted",
  decline: "Appointment rejected",
  complete: "Appointment completed",
  cancel: "Appointment cancelled",
};

const FAILURE: Record<AppointmentAction, string> = {
  confirm: "Could not accept appointment",
  decline: "Could not reject appointment",
  complete: "Could not complete appointment",
  cancel: "Could not cancel appointment",
};

/** Reject and cancel can be undone for five seconds; accept and complete commit at once. */
const UNDOABLE: ReadonlySet<AppointmentAction> = new Set(["decline", "cancel"]);
/** Accept and complete ask first, because the allergy warning matters there. */
const CONFIRMED_FIRST: ReadonlySet<AppointmentAction> = new Set([
  "confirm",
  "complete",
]);

export interface PendingAction {
  item: AppointmentListItem;
  action: AppointmentAction;
}

/**
 * Status changes from the appointments page. Each one shows at once in every
 * loaded list (`mutateLists`), then sends the request; failures roll back.
 */
export function useAppointmentActions(
  mutateLists: (
    change: (items: AppointmentListItem[]) => AppointmentListItem[],
  ) => void,
  refresh: () => void,
) {
  const appointmentService = useService("appointmentService");
  const runOptimistic = useOptimisticMutations(refresh);

  const run = (item: AppointmentListItem, action: AppointmentAction) => {
    const status = nextAppointmentStatus(item.status, action);
    if (!status) return;
    const replaceWith =
      (next: AppointmentListItem) => (list: AppointmentListItem[]) =>
        list.map((other) => (other.id === item.id ? next : other));
    runOptimistic({
      apply: () => mutateLists(replaceWith({ ...item, status })),
      rollback: () => mutateLists(replaceWith(item)),
      request: () => appointmentService[action](item.id),
      failureMessage: FAILURE[action],
      successMessage: SUCCESS[action],
      undo: UNDOABLE.has(action) ? {} : undefined,
    });
  };

  /** Starts an action: accept and complete return a pending confirmation instead of running. */
  const start = (
    item: AppointmentListItem,
    action: AppointmentAction,
  ): PendingAction | null => {
    if (CONFIRMED_FIRST.has(action)) return { item, action };
    run(item, action);
    return null;
  };

  return { run, start };
}
