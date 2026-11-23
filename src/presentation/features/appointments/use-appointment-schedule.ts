"use client";

import { useState } from "react";
import type {
  AppointmentScope,
  AppointmentService,
} from "@/application/services/appointment-service";
import { useService } from "@/di/container-provider";
import type { AppointmentInput, Provider } from "@/domain/entities";
import type { AppointmentListItem } from "@/domain/repositories";
import { useAsyncData } from "@/presentation/hooks/use-async-data";
import { useOptimisticMutations } from "@/presentation/hooks/use-optimistic-mutations";
import { type DateRange, scopeFilter } from "./appointment-range";

const PAGE_SIZE = 100;
/** Caps paging so a runaway backend cannot stall the page. */
const MAX_PAGES = 20;

/** Every appointment in the range the scope may see, soonest first. Pages until all are loaded. */
export async function fetchRange(
  appointments: AppointmentService,
  scope: AppointmentScope,
  range: DateRange,
): Promise<AppointmentListItem[]> {
  const filter = scopeFilter(scope);
  if (!filter) return [];
  const found: AppointmentListItem[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await appointments.search({
      ...filter,
      from: range.from,
      to: range.to,
      page,
      pageSize: PAGE_SIZE,
    });
    found.push(...result.items);
    if (result.items.length < PAGE_SIZE || found.length >= result.totalCount)
      break;
  }
  return found.sort(
    (a, b) =>
      Date.parse(a.appointmentDateTime) - Date.parse(b.appointmentDateTime),
  );
}

/**
 * Data and mutations behind the appointments page for one date range. Edits
 * apply optimistically and reconcile with the server when the queue drains.
 */
export function useAppointmentSchedule(
  range: DateRange | null,
  scope: AppointmentScope,
) {
  const appointmentService = useService("appointmentService");
  const configurationService = useService("configurationService");
  const providerService = useService("providerService");
  const scopeKey = JSON.stringify(scope);
  const rangeKey = range ? `${range.from}|${range.to}|${scopeKey}` : "";

  const settings = useAsyncData(
    () => configurationService.getAppointmentSettings(),
    "settings",
  );
  const providers = useAsyncData<Provider[]>(
    () => (scope.mode === "all" ? providerService.list() : Promise.resolve([])),
    scope.mode,
  );
  const items = useAsyncData<AppointmentListItem[]>(
    () =>
      range
        ? fetchRange(appointmentService, scope, range)
        : Promise.resolve([]),
    rangeKey,
  );

  const runOptimistic = useOptimisticMutations(items.refresh);
  const [form, setForm] = useState<{
    open: boolean;
    editing: AppointmentListItem | null;
    /** Pre-filled patient id for admins booking from a patient page. */
    patientId?: string;
  }>({ open: false, editing: null });
  const [deleting, setDeleting] = useState<AppointmentListItem | null>(null);

  const inRange = (iso: string) =>
    range !== null &&
    Date.parse(iso) >= Date.parse(range.from) &&
    Date.parse(iso) < Date.parse(range.to);
  const editItems = (
    change: (items: AppointmentListItem[]) => AppointmentListItem[],
  ) => items.mutate((current) => current && change(current));

  /** Creates (`editing` null) or updates; `overrides` carries the joined names. */
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
        editItems((list) =>
          inRange(created.appointmentDateTime) ? [...list, created] : list,
        ),
      rollback: () =>
        editItems((list) => list.filter((item) => item.id !== created.id)),
      request: () => appointmentService.create(input, created.id),
      failureMessage: "Could not add appointment",
    });
  };

  const remove = (item: AppointmentListItem) => {
    runOptimistic({
      apply: () =>
        editItems((list) => list.filter((other) => other.id !== item.id)),
      rollback: () => editItems((list) => [...list, item]),
      request: () => appointmentService.delete(item.id),
      failureMessage: "Could not delete appointment",
    });
  };

  const retry = () => {
    void settings.reload();
    void providers.reload();
    void items.reload();
  };

  return {
    settings: settings.data,
    providers: providers.data,
    items: items.data,
    loading: settings.loading || providers.loading || items.loading,
    error: settings.error ?? providers.error ?? items.error,
    retry,
    refresh: items.refresh,
    /** Applies a local change to the loaded items (optimistic status edits). */
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
