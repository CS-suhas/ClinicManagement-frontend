import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNotify } from "@/components/notifications";
import type { VerificationStatus } from "@/features/auth/schemas";
import {
  fetchProviderBusyCount,
  fetchProviderSummary,
  resolveNextFreeSlot,
  unlessDenied,
} from "@/features/doctors/api";
import { localDayOf } from "@/features/doctors/utils";
import {
  type Page,
  type PageParams,
  usePagedList,
} from "@/hooks/use-paged-list";
import { api, newId, unwrap } from "@/lib/api";
import { toOffsetDateTime } from "@/lib/dates";
import { getErrorMessage } from "@/lib/errors";
import { PROVIDER_KEYS } from "@/lib/query-client";
import type { Provider, ProviderForm } from "./schemas";

export const ALL_CLINICS = "all";

const asVerificationQuery = (status: VerificationStatus) =>
  status as unknown as number;

export const searchProviders = ({
  search,
  page,
  pageSize,
  clinicId,
}: PageParams & { clinicId?: string }) =>
  unwrap(
    api.GET("/api/providers/search", {
      params: {
        query: { Search: search, Page: page, PageSize: pageSize, clinicId },
      },
    }),
  );

export function useProviderList(clinicFilter: string) {
  const clinicId = clinicFilter === ALL_CLINICS ? undefined : clinicFilter;
  return usePagedList(["providers", "list", clinicFilter], (params) =>
    searchProviders({ ...params, clinicId }),
  );
}

export const searchProvidersByStatus = (
  verificationStatus: VerificationStatus,
  search: string | undefined,
) =>
  unwrap(
    api.GET("/api/providers/search", {
      params: {
        query: {
          verificationStatus: asVerificationQuery(verificationStatus),
          Search: search,
          Page: 1,
          PageSize: 100,
        },
      },
    }),
  );

export const fetchClinicProviders = (clinicId: string) =>
  unwrap(
    api.GET("/api/clinics/{id}/providers", {
      params: { path: { id: clinicId } },
    }),
  );

export const fetchClinic = (id: string) =>
  unwrap(api.GET("/api/clinics/{id}", { params: { path: { id } } }));

export const verifyProvider = (id: string) =>
  unwrap(api.POST("/api/providers/{id}/verify", { params: { path: { id } } }));

export const rejectProvider = (id: string) =>
  unwrap(api.POST("/api/providers/{id}/reject", { params: { path: { id } } }));

export function usePatchProviderLists() {
  const queryClient = useQueryClient();
  return (id: string, change: Partial<Provider>) =>
    queryClient.setQueriesData<Page<Provider>>(
      { queryKey: ["providers", "list"] },
      (page) =>
        page && {
          ...page,
          items: page.items.map((p) => (p.id === id ? { ...p, ...change } : p)),
        },
    );
}

export function useSaveProvider() {
  const { notifySuccess } = useNotify();
  return useMutation({
    meta: { invalidates: PROVIDER_KEYS },
    mutationFn: ({ id, values }: { id?: string; values: ProviderForm }) => {
      const body = {
        clinicId: values.clinicId,
        firstName: values.firstName,
        lastName: values.lastName,
        specialty: values.specialty,
        fee: values.fee ?? null,
        gender: values.gender ?? null,
      };
      return id
        ? unwrap(
            api.PUT("/api/providers/{id}", {
              params: { path: { id } },
              body: { id, ...body },
            }),
          )
        : unwrap(
            api.POST("/api/providers", { body: { id: newId(), ...body } }),
          );
    },
    onSuccess: (_, { id }) =>
      notifySuccess(id ? "Provider saved" : "Provider added"),
  });
}

export function useDeleteProvider() {
  const { notifySuccess, notifyError } = useNotify();
  return useMutation({
    meta: { invalidates: PROVIDER_KEYS },
    mutationFn: (id: string) =>
      unwrap(api.DELETE("/api/providers/{id}", { params: { path: { id } } })),
    onSuccess: () => notifySuccess("Provider deleted"),
    onError: (e) =>
      notifyError(`Could not delete provider: ${getErrorMessage(e)}`),
  });
}

export async function fetchProviderPanel(providerId: string) {
  const data = await unlessDenied(() => fetchProviderSummary(providerId));
  const todaySlots = data
    ? await fetchProviderBusyCount(providerId, localDayOf(Date.now()))
    : null;
  const nextAvailableStart = data
    ? await resolveNextFreeSlot(
        providerId,
        data.nextAvailableStart ?? null,
        Date.now(),
      )
    : null;
  return { clinic: data?.clinic ?? null, nextAvailableStart, todaySlots };
}

export function useProviderPanel(providerId: string) {
  return useQuery({
    queryKey: ["providers", providerId, "panel"],
    queryFn: () => fetchProviderPanel(providerId),
  });
}

export async function fetchProviderUpcoming(providerId: string, limit: number) {
  const result = await unlessDenied(() =>
    unwrap(
      api.GET("/api/appointments/search", {
        params: {
          query: {
            ProviderId: providerId,
            From: toOffsetDateTime(`${localDayOf(Date.now())}T00:00`),
            Page: 1,
            PageSize: limit,
          },
        },
      }),
    ),
  );
  return result?.items ?? null;
}

export function useProviderUpcoming(providerId: string, allowed: boolean) {
  return useQuery({
    queryKey: ["providers", providerId, "upcoming", allowed],
    queryFn: () => (allowed ? fetchProviderUpcoming(providerId, 5) : null),
  });
}
