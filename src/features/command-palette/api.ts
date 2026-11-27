import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";

export function useGlobalSearch(q: string, enabled: boolean) {
  return useQuery({
    queryKey: ["search", q],
    queryFn: () =>
      unwrap(api.GET("/api/search", { params: { query: { q, limit: "5" } } })),
    enabled,
    placeholderData: keepPreviousData,
  });
}
