import {
  MutationCache,
  QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { ApiError } from "./api";

export function makeQueryClient() {
  const queryClient: QueryClient = new QueryClient({
    mutationCache: new MutationCache({
      onSuccess: (_data, _variables, _context, mutation) =>
        invalidate(
          queryClient,
          (mutation.meta?.invalidates as QueryKey[] | undefined) ?? [],
        ),
    }),
    defaultOptions: {
      queries: {
        staleTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status < 500) &&
          failureCount < 1,
      },
    },
  });
  return queryClient;
}

export function invalidate(queryClient: QueryClient, keys: QueryKey[]) {
  return Promise.all(
    keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
}

export const APPOINTMENT_KEYS: QueryKey[] = [
  ["appointments"],
  ["patients"],
  ["providers"],
  ["dashboard"],
];

export const PROVIDER_KEYS: QueryKey[] = [
  ["providers"],
  ["clinics"],
  ["dashboard"],
];
