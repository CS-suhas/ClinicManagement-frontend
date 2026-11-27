"use client";

import { localMidnightIso } from "@/application/services/appointment-service";
import { useService } from "@/di/container-provider";
import type { AppointmentListItem } from "@/domain/repositories";
import { useAsyncData } from "@/hooks/use-async-data";

const PAGE_SIZE = 50;

export function usePendingRequests(
  providerId: string | null,
  todayKey: string | null,
) {
  const appointmentService = useService("appointmentService");
  const { data, error, loading, reload, refresh, mutate } = useAsyncData(
    () =>
      providerId && todayKey
        ? appointmentService.search({
            providerId,
            status: "REQUESTED",
            from: localMidnightIso(todayKey),
            page: 1,
            pageSize: PAGE_SIZE,
          })
        : Promise.resolve({
            items: [],
            totalCount: 0,
            page: 1,
            pageSize: PAGE_SIZE,
          }),
    `${providerId}|${todayKey}`,
  );
  const items: AppointmentListItem[] = data?.items ?? [];
  const pending = items.filter((item) => item.status === "REQUESTED");
  return {
    items: pending,
    more: (data?.totalCount ?? 0) > PAGE_SIZE,
    error,
    loading,
    reload,
    refresh,
    mutateItems: (
      change: (list: AppointmentListItem[]) => AppointmentListItem[],
    ) =>
      mutate(
        (current) => current && { ...current, items: change(current.items) },
      ),
  };
}
