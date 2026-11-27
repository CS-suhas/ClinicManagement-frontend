import { $api, byId } from "@/lib/api";

export const useMyProvider = (providerId: string | null) =>
  $api.useQuery("get", "/api/providers/{id}", byId(providerId ?? ""), {
    enabled: providerId !== null,
  });
