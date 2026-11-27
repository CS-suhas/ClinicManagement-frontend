"use client";

import { useOptimisticMutations } from "@/hooks/use-optimistic-mutations";
import { APPOINTMENT_KEYS } from "@/lib/query-client";
import { transitionAppointment } from "../api";
import type { AppointmentAction, AppointmentListItem } from "../schemas";
import { nextAppointmentStatus } from "../utils";

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

const UNDOABLE: ReadonlySet<AppointmentAction> = new Set(["decline", "cancel"]);
const CONFIRMED_FIRST: ReadonlySet<AppointmentAction> = new Set([
  "confirm",
  "complete",
]);

export type PendingAction = {
  item: AppointmentListItem;
  action: AppointmentAction;
};

export function useAppointmentActions(
  mutateLists: (
    change: (items: AppointmentListItem[]) => AppointmentListItem[],
  ) => void,
) {
  const runOptimistic = useOptimisticMutations(APPOINTMENT_KEYS);

  const run = (item: AppointmentListItem, action: AppointmentAction) => {
    const status = nextAppointmentStatus(item.status, action);
    if (!status) return;
    const replaceWith =
      (next: AppointmentListItem) => (list: AppointmentListItem[]) =>
        list.map((other) => (other.id === item.id ? next : other));
    runOptimistic({
      apply: () => mutateLists(replaceWith({ ...item, status })),
      rollback: () => mutateLists(replaceWith(item)),
      request: () => transitionAppointment(item.id, action),
      failureMessage: FAILURE[action],
      successMessage: SUCCESS[action],
      undo: UNDOABLE.has(action) ? {} : undefined,
    });
  };

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
