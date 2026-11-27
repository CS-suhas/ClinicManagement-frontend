"use client";

import { useMutation } from "@tanstack/react-query";
import { notify } from "@/components/notifications";
import { getErrorMessage } from "@/lib/errors";
import { APPOINTMENT_CHANGES } from "@/lib/query-client";
import { transitionAppointment } from "../api";
import type { AppointmentAction, AppointmentListItem } from "../schemas";
import { nextAppointmentStatus } from "../utils";

export const ACTION_LABEL: Record<AppointmentAction, string> = {
  confirm: "Accept",
  decline: "Reject",
  complete: "Complete",
  cancel: "Cancel visit",
};

export const ACTION_QUESTION: Record<AppointmentAction, string> = {
  confirm: "Accept this request?",
  decline: "Reject this request?",
  complete: "Mark this visit as completed?",
  cancel: "Cancel this visit?",
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

export type PendingAction = {
  item: AppointmentListItem;
  action: AppointmentAction;
};

export function useAppointmentActions() {
  const mutation = useMutation({
    meta: { invalidates: APPOINTMENT_CHANGES },
    mutationFn: ({ item, action }: PendingAction) =>
      transitionAppointment(item.id, action),
    onSuccess: (_, { action }) => notify.success(SUCCESS[action]),
    onError: (e, { action }) =>
      notify.error(`${FAILURE[action]}: ${getErrorMessage(e)}`),
  });

  const run = (item: AppointmentListItem, action: AppointmentAction) => {
    if (nextAppointmentStatus(item.status, action))
      mutation.mutate({ item, action });
  };

  return { run };
}
