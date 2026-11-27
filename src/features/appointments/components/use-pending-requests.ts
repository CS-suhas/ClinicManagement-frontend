"use client";

import { useQueryClient } from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/errors";
import { pendingQueryKey, usePendingRequestsQuery } from "../api";
import type { AppointmentListItem } from "../schemas";

const PAGE_SIZE = 50;

export function usePendingRequests(
  providerId: string | null,
  todayKey: string | null,
) {
  const queryClient = useQueryClient();
  const { data, error, isPending, refetch } = usePendingRequestsQuery(
    providerId,
    todayKey,
  );
  const items = (data?.items ?? []).filter(
    (item) => item.status === "REQUESTED",
  );
  return {
    items,
    more: (data?.totalCount ?? 0) > PAGE_SIZE,
    error: error ? getErrorMessage(error) : null,
    loading: isPending,
    reload: () => void refetch(),
    mutateItems: (
      change: (list: AppointmentListItem[]) => AppointmentListItem[],
    ) =>
      queryClient.setQueryData<{ items: AppointmentListItem[] }>(
        pendingQueryKey(providerId, todayKey),
        (current) => current && { ...current, items: change(current.items) },
      ),
  };
}
