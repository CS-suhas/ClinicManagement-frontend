"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useOptimisticMutations } from "@/hooks/use-optimistic-mutations";
import { newId } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import {
  createAppointment,
  deleteAppointment,
  rangeQueryKey,
  updateAppointment,
  useAppointmentRange,
  useAppointmentSettings,
  useProviders,
} from "../api";
import type { AppointmentInput, AppointmentListItem } from "../schemas";
import type { AppointmentScope } from "../utils";
import type { DateRange } from "./appointment-range";

export function useAppointmentSchedule(
  range: DateRange | null,
  scope: AppointmentScope,
) {
  const queryClient = useQueryClient();
  const settings = useAppointmentSettings();
  const providers = useProviders(scope.mode === "all");
  const items = useAppointmentRange(range, scope);
  const runOptimistic = useOptimisticMutations();
  const [form, setForm] = useState<{
    open: boolean;
    editing: AppointmentListItem | null;
    patientId?: string;
  }>({ open: false, editing: null });
  const [deleting, setDeleting] = useState<AppointmentListItem | null>(null);

  const inRange = (iso: string) =>
    range !== null &&
    Date.parse(iso) >= Date.parse(range.from) &&
    Date.parse(iso) < Date.parse(range.to);
  const editItems = (
    change: (items: AppointmentListItem[]) => AppointmentListItem[],
  ) =>
    queryClient.setQueryData<AppointmentListItem[]>(
      rangeQueryKey(range, scope),
      (current) => current && change(current),
    );

  const save = (
    input: AppointmentInput,
    editing: AppointmentListItem | null,
    overrides: Partial<AppointmentListItem>,
  ) => {
    if (editing) {
      const updated = { ...editing, ...input, ...overrides };
      runOptimistic({
        apply: () =>
          editItems((list) =>
            list.flatMap((item) => {
              if (item.id !== editing.id) return [item];
              return inRange(updated.appointmentDateTime) ? [updated] : [];
            }),
          ),
        rollback: () =>
          editItems((list) =>
            list.map((item) => (item.id === editing.id ? editing : item)),
          ),
        request: () => updateAppointment(editing.id, input),
        failureMessage: "Could not update appointment",
      });
      return;
    }
    const created = {
      ...input,
      id: newId(),
      ...overrides,
    } as AppointmentListItem;
    runOptimistic({
      apply: () =>
        editItems((list) =>
          inRange(created.appointmentDateTime) ? [...list, created] : list,
        ),
      rollback: () =>
        editItems((list) => list.filter((item) => item.id !== created.id)),
      request: () => createAppointment(created.id, input),
      failureMessage: "Could not add appointment",
    });
  };

  const remove = (item: AppointmentListItem) => {
    runOptimistic({
      apply: () =>
        editItems((list) => list.filter((other) => other.id !== item.id)),
      rollback: () => editItems((list) => [...list, item]),
      request: () => deleteAppointment(item.id),
      failureMessage: "Could not delete appointment",
    });
  };

  const failure = settings.error ?? providers.error ?? items.error;

  const retry = () => {
    void settings.refetch();
    void providers.refetch();
    void items.refetch();
  };

  return {
    settings: settings.data,
    providers: providers.data,
    items: items.data,
    error: failure ? getErrorMessage(failure) : null,
    retry,
    mutateItems: editItems,
    save,
    remove,
    form: {
      open: form.open,
      editing: form.editing,
      patientId: form.patientId,
      openCreate: (patientId?: string) =>
        setForm({ open: true, editing: null, patientId }),
      openEdit: (item: AppointmentListItem) =>
        setForm({ open: true, editing: item }),
      onOpenChange: (open: boolean) =>
        setForm((current) => ({ ...current, open })),
    },
    deleting,
    setDeleting,
  };
}
