"use client";

import { getErrorMessage } from "@/lib/errors";
import { usePendingRequestsQuery } from "../api";

const PAGE_SIZE = 50;

export function usePendingRequests(
  providerId: string | null,
  todayKey: string | null,
) {
  const { data, error, isLoading, refetch } = usePendingRequestsQuery(
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
    loading: isLoading,
    reload: () => void refetch(),
  };
}
