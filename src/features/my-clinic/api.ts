import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";

export function useMyProvider(providerId: string | null) {
  return useQuery({
    queryKey: ["providers", providerId],
    queryFn: () =>
      providerId === null
        ? null
        : unwrap(
            api.GET("/api/providers/{id}", {
              params: { path: { id: providerId } },
            }),
          ),
  });
}
