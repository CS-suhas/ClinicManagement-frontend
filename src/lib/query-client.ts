import { MutationCache, QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api";

export function makeQueryClient() {
  const queryClient: QueryClient = new QueryClient({
    mutationCache: new MutationCache({
      onSettled: () => queryClient.invalidateQueries(),
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status < 500) &&
          failureCount < 1,
      },
    },
  });
  return queryClient;
}
