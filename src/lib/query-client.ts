import {
  MutationCache,
  QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { notify } from "@/components/notifications";
import { ApiError } from "./api";
import { getErrorMessage } from "./errors";

export type Resource =
  | "patients"
  | "providers"
  | "clinics"
  | "appointments"
  | "allergy-types"
  | "dashboard";

export type MutationMeta = {
  invalidates?: readonly Resource[];
  success?: string;
  error?: string;
};

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: MutationMeta;
  }
}

export const APPOINTMENT_CHANGES: Resource[] = [
  "appointments",
  "patients",
  "providers",
  "dashboard",
];

export const PROVIDER_CHANGES: Resource[] = [
  "providers",
  "clinics",
  "dashboard",
];

export const resourceKey = (resource: Resource, ...parts: unknown[]) => [
  resource,
  ...parts,
];

const belongsTo = (key: QueryKey, resource: Resource) =>
  key.some(
    (part) =>
      typeof part === "string" &&
      (part === resource || part.split("/").includes(resource)),
  );

export function invalidate(
  queryClient: QueryClient,
  resources: readonly Resource[],
) {
  if (resources.length === 0) return;
  return queryClient.invalidateQueries({
    predicate: ({ queryKey }) => resources.some((r) => belongsTo(queryKey, r)),
  });
}

export function makeQueryClient() {
  const queryClient: QueryClient = new QueryClient({
    mutationCache: new MutationCache({
      onSuccess: (_data, _variables, _context, { meta }) => {
        if (meta?.success) notify.success(meta.success);
        return invalidate(queryClient, meta?.invalidates ?? []);
      },
      onError: (error, _variables, _context, { meta }) => {
        if (meta?.error)
          notify.error(`${meta.error}: ${getErrorMessage(error)}`);
      },
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
