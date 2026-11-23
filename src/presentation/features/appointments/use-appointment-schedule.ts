"use client";

import { useState } from "react";
import {
  type AppointmentScope,
  appointmentDayQuery,
} from "@/application/services/appointment-service";
import { useService } from "@/di/container-provider";
import type { AppointmentInput, Provider } from "@/domain/entities";
import type { AppointmentListItem } from "@/domain/repositories";
import { useAsyncData } from "@/presentation/hooks/use-async-data";
import { useOptimisticMutations } from "@/presentation/hooks/use-optimistic-mutations";
import { dateKeyOf } from "./schedule-time";

/**
 * Data and mutations behind the appointments page for one local day. Edits
 * apply optimistically and reconcile with the server when the queue drains.
 */
export function useAppointmentSchedule(
  dateKey: string | null,
  scope: AppointmentScope,
) {
  const appointmentService = useService("appointmentService");
  const configurationService = useService("configurationService");
  const providerService = useService("providerService");
  const scopeKey = JSON.stringify(scope);

  const settings = useAsyncData(
    () => configurationService.getAppointmentSettings(),
    "settings",
  );
  const providers = useAsyncData<Provider[]>(
    () => (scope.mode === "all" ? providerService.list() : Promise.resolve([])),
    scope.mode,
  );
  const day = useAsyncData<AppointmentListItem[]>(
    () =>
      dateKey
        ? appointmentService.listForDay(appointmentDayQuery(scope, dateKey))
        : Promise.resolve([]),
    `${dateKey}|${scopeKey}`,
  );

  const runOptimistic = useOptimisticMutations(day.refresh);
  const [form, setForm] = useState<{
    open: boolean;
    editing: AppointmentListItem | null;
  }>({ open: false, editing: null });
  const [deleting, setDeleting] = useState<AppointmentListItem | null>(null);

  const inDay = (iso: string) => dateKey !== null && dateKeyOf(iso) === dateKey;
  const editItems = (
    change: (items: AppointmentListItem[]) => AppointmentListItem[],
  ) => day.mutate((current) => current && change(current));

  /** Creates (`editing` null) or updates; `overrides` carries the joined names. */
  const save = (
    input: AppointmentInput,
    editing: AppointmentListItem | null,
    overrides: Partial<AppointmentListItem>,
  ) => {
    appointmentService.validateInput(input);
    if (editing) {
      const updated = { ...editing, ...input, ...overrides };
      runOptimistic({
        apply: () =>
          editItems((items) =>
            items.flatMap((item) => {
              if (item.id !== editing.id) return [item];
              return inDay(updated.appointmentDateTime) ? [updated] : [];
            }),
          ),
        rollback: () =>
          editItems((items) =>
            items.map((item) => (item.id === editing.id ? editing : item)),
          ),
        request: () => appointmentService.update(editing.id, input),
        failureMessage: "Could not update appointment",
      });
      return;
    }
    const created = {
      ...input,
      id: crypto.randomUUID(),
      ...overrides,
    } as AppointmentListItem;
    runOptimistic({
      apply: () =>
        editItems((items) =>
          inDay(created.appointmentDateTime) ? [...items, created] : items,
        ),
      rollback: () =>
        editItems((items) => items.filter((item) => item.id !== created.id)),
      request: () => appointmentService.create(input, created.id),
      failureMessage: "Could not add appointment",
    });
  };

  const remove = (item: AppointmentListItem) => {
    runOptimistic({
      apply: () =>
        editItems((items) => items.filter((other) => other.id !== item.id)),
      rollback: () => editItems((items) => [...items, item]),
      request: () => appointmentService.delete(item.id),
      failureMessage: "Could not delete appointment",
    });
  };

  const retry = () => {
    void settings.reload();
    void providers.reload();
    void day.reload();
  };

  return {
    settings: settings.data,
    providers: providers.data,
    items: day.data,
    loading: settings.loading || providers.loading || day.loading,
    error: settings.error ?? providers.error ?? day.error,
    retry,
    save,
    remove,
    form: {
      open: form.open,
      editing: form.editing,
      openCreate: () => setForm({ open: true, editing: null }),
      openEdit: (item: AppointmentListItem) =>
        setForm({ open: true, editing: item }),
      onOpenChange: (open: boolean) =>
        setForm((current) => ({ ...current, open })),
    },
    deleting,
    setDeleting,
  };
}
