import { useQuery } from "@tanstack/react-query";
import type { VerificationStatus } from "@/features/auth/schemas";
import {
  fetchProviderBusyCount,
  fetchProviderSummary,
  resolveNextFreeSlot,
} from "@/features/doctors/api";
import { localDayOf } from "@/features/doctors/utils";
import { pageQuery, usePagedList } from "@/hooks/use-paged-list";
import { $api, api, byId, newId, orNull, unwrap } from "@/lib/api";
import { toOffsetDateTime } from "@/lib/dates";
import { PROVIDER_CHANGES, resourceKey } from "@/lib/query-client";
import type { ProviderForm } from "./schemas";

export const ALL_CLINICS = "all";

export type Decision = "verify" | "reject";

export function useProviderList(clinicFilter: string) {
  const clinicId = clinicFilter === ALL_CLINICS ? undefined : clinicFilter;
  return usePagedList((page) =>
    $api.queryOptions("get", "/api/providers/search", {
      params: { query: { ...pageQuery(page), clinicId } },
    }),
  );
}

export const useProvidersByStatus = (
  status: VerificationStatus,
  search: string,
) =>
  $api.useQuery(
    "get",
    "/api/providers/search",
    {
      params: {
        query: {
          verificationStatus: status,
          Search: search || undefined,
          Page: 1,
          PageSize: 100,
        },
      },
    },
    { select: (page) => page.items },
  );

export const useClinicProviders = (clinicId: string | null) =>
  $api.useQuery("get", "/api/clinics/{id}/providers", byId(clinicId ?? ""), {
    enabled: clinicId !== null,
  });

export const fetchClinic = (id: string) =>
  unwrap(api.GET("/api/clinics/{id}", byId(id)));

export const decideProvider = (id: string, decision: Decision) =>
  decision === "verify"
    ? api.POST("/api/providers/{id}/verify", byId(id))
    : api.POST("/api/providers/{id}/reject", byId(id));

export function useSaveProvider() {
  const create = $api.useMutation("post", "/api/providers", {
    meta: { invalidates: PROVIDER_CHANGES, success: "Provider added" },
  });
  const update = $api.useMutation("put", "/api/providers/{id}", {
    meta: { invalidates: PROVIDER_CHANGES, success: "Provider saved" },
  });
  return (id: string | undefined, values: ProviderForm) =>
    id
      ? update.mutateAsync({
          params: { path: { id } },
          body: { id, ...values },
        })
      : create.mutateAsync({ body: { id: newId(), ...values } });
}

export const useDeleteProvider = () =>
  $api.useMutation("delete", "/api/providers/{id}", {
    meta: {
      invalidates: PROVIDER_CHANGES,
      success: "Provider deleted",
      error: "Could not delete provider",
    },
  });

async function fetchProviderPanel(providerId: string) {
  const data = await orNull(() => fetchProviderSummary(providerId));
  if (!data)
    return { clinic: null, nextAvailableStart: null, todaySlots: null };
  return {
    clinic: data.clinic ?? null,
    todaySlots: await fetchProviderBusyCount(
      providerId,
      localDayOf(Date.now()),
    ),
    nextAvailableStart: await resolveNextFreeSlot(
      providerId,
      data.nextAvailableStart ?? null,
      Date.now(),
    ),
  };
}

export function useProviderPanel(providerId: string) {
  return useQuery({
    queryKey: resourceKey("providers", providerId, "panel"),
    queryFn: () => fetchProviderPanel(providerId),
  });
}

export const useProviderUpcoming = (providerId: string, allowed: boolean) =>
  $api.useQuery(
    "get",
    "/api/appointments/search",
    {
      params: {
        query: {
          ProviderId: providerId,
          From: toOffsetDateTime(`${localDayOf(Date.now())}T00:00`),
          Page: 1,
          PageSize: 5,
        },
      },
    },
    { enabled: allowed, select: (page) => page.items },
  );
