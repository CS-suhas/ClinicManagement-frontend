import { keepPreviousData } from "@tanstack/react-query";
import { $api } from "@/lib/api";

export const useGlobalSearch = (q: string, enabled: boolean) =>
  $api.useQuery(
    "get",
    "/api/search",
    { params: { query: { q, limit: "5" } } },
    { enabled, placeholderData: keepPreviousData },
  );
