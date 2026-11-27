import { $api } from "@/lib/api";

const REFRESH_MS = 60_000;

export const useDashboard = (enabled = true) =>
  $api.useQuery("get", "/api/me/dashboard", undefined, {
    enabled,
    refetchInterval: REFRESH_MS,
  });
