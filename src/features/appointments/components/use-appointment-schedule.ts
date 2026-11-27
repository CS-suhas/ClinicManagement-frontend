"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNotify } from "@/components/notifications";
import { newId } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { APPOINTMENT_KEYS } from "@/lib/query-client";
import {
  createAppointment,
  deleteAppointment,
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
  const settings = useAppointmentSettings();
  const providers = useProviders(scope.mode === "all");
  const items = useAppointmentRange(range, scope);
  const { notifyError } = useNotify();
  const [form, setForm] = useState<{
    open: boolean;
    editing: AppointmentListItem | null;
    patientId?: string;
  }>({ open: false, editing: null });
  const [deleting, setDeleting] = useState<AppointmentListItem | null>(null);

  const saveMutation = useMutation({
    meta: { invalidates: APPOINTMENT_KEYS },
    mutationFn: ({
      input,
      editing,
    }: {
      input: AppointmentInput;
      editing: AppointmentListItem | null;
    }) =>
      editing
        ? updateAppointment(editing.id, input)
        : createAppointment(newId(), input),
  });

  const removeMutation = useMutation({
    meta: { invalidates: APPOINTMENT_KEYS },
    mutationFn: (item: AppointmentListItem) => deleteAppointment(item.id),
    onError: (e) =>
      notifyError(`Could not delete appointment: ${getErrorMessage(e)}`),
  });

  const save = (input: AppointmentInput, editing: AppointmentListItem | null) =>
    saveMutation.mutateAsync({ input, editing });

  const remove = (item: AppointmentListItem) => removeMutation.mutate(item);

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
