import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";

const REFRESH_MS = 60_000;

export function useDashboard(enabled = true) {
  return useQuery({
    queryKey: ["dashboard", "me"],
    queryFn: () => unwrap(api.GET("/api/me/dashboard")),
    enabled,
    refetchInterval: REFRESH_MS,
  });
}
