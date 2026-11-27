import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api, type Schemas, unwrap } from "@/lib/api";
import { localMidnightIso } from "@/lib/dates";
import {
  type AppointmentAction,
  type AppointmentInput,
  type AppointmentListItem,
  type AppointmentStatus,
  appointmentSettingsSchema,
} from "./schemas";
import { type AppointmentScope, scopeFilter } from "./utils";

const PAGE_SIZE = 100;
const MAX_PAGES = 20;

export type DateRange = { from: string; to: string };

type AppointmentSearch = {
  from?: string;
  to?: string;
  clinicId?: string;
  providerId?: string;
  patientId?: string;
  status?: AppointmentStatus;
  page: number;
  pageSize: number;
};

const searchAppointments = ({
  status,
  page,
  pageSize,
  ...rest
}: AppointmentSearch) =>
  unwrap(
    api.GET("/api/appointments/search", {
      params: {
        query: {
          From: rest.from,
          To: rest.to,
          ClinicId: rest.clinicId,
          ProviderId: rest.providerId,
          PatientId: rest.patientId,
          Status: status as unknown as Schemas["AppointmentStatus"],
          Page: page,
          PageSize: pageSize,
        },
      },
    }),
  );

const byStart = (a: AppointmentListItem, b: AppointmentListItem) =>
  Date.parse(a.appointmentDateTime) - Date.parse(b.appointmentDateTime);

async function fetchRange(scope: AppointmentScope, range: DateRange) {
  const filter = scopeFilter(scope);
  if (!filter) return [];
  const found: AppointmentListItem[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await searchAppointments({
      ...filter,
      from: range.from,
      to: range.to,
      page,
      pageSize: PAGE_SIZE,
    });
    found.push(...result.items);
    if (result.items.length < PAGE_SIZE || found.length >= result.totalCount)
      break;
  }
  return found.sort(byStart);
}

export const rangeQueryKey = (
  range: DateRange | null,
  scope: AppointmentScope,
) => ["appointments", "range", range?.from, range?.to, scope];

export function useAppointmentRange(
  range: DateRange | null,
  scope: AppointmentScope,
) {
  return useQuery({
    queryKey: rangeQueryKey(range, scope),
    queryFn: () => (range ? fetchRange(scope, range) : []),
    enabled: range !== null,
    placeholderData: keepPreviousData,
  });
}

const PENDING_PAGE_SIZE = 50;

export const pendingQueryKey = (
  providerId: string | null,
  todayKey: string | null,
) => ["appointments", "pending", providerId, todayKey];

export function usePendingRequestsQuery(
  providerId: string | null,
  todayKey: string | null,
) {
  return useQuery({
    queryKey: pendingQueryKey(providerId, todayKey),
    queryFn: () =>
      providerId && todayKey
        ? searchAppointments({
            providerId,
            status: "REQUESTED",
            from: localMidnightIso(todayKey),
            page: 1,
            pageSize: PENDING_PAGE_SIZE,
          })
        : { items: [], totalCount: 0, page: 1, pageSize: PENDING_PAGE_SIZE },
  });
}

export function useAppointmentSettings() {
  return useQuery({
    queryKey: ["appointment-settings"],
    queryFn: async () => {
      const parsed = appointmentSettingsSchema.safeParse(
        await unwrap(api.GET("/api/appointment-settings")),
      );
      if (!parsed.success)
        throw new Error("The API returned invalid appointment settings.");
      return parsed.data;
    },
  });
}

export function useProviders(enabled: boolean) {
  return useQuery({
    queryKey: ["providers"],
    queryFn: () => unwrap(api.GET("/api/providers")),
    enabled,
  });
}

export function useClinics(enabled: boolean) {
  return useQuery({
    queryKey: ["clinics"],
    queryFn: () => unwrap(api.GET("/api/clinics")),
    enabled,
  });
}

export function usePatientOptions(enabled: boolean, search: string) {
  return useQuery({
    queryKey: ["patients", "options", search],
    queryFn: () =>
      unwrap(
        api.GET("/api/patients/search", {
          params: {
            query: { Search: search || undefined, Page: 1, PageSize: 100 },
          },
        }),
      ),
    enabled,
  });
}

export function useClinicOptions(enabled: boolean, search: string) {
  return useQuery({
    queryKey: ["clinics", "options", search],
    queryFn: () =>
      unwrap(
        api.GET("/api/clinics/search", {
          params: {
            query: { Search: search || undefined, Page: 1, PageSize: 100 },
          },
        }),
      ),
    enabled,
  });
}

export function useProviderOptions(
  enabled: boolean,
  clinicId: string,
  search: string,
) {
  return useQuery({
    queryKey: ["providers", "options", clinicId, search],
    queryFn: () =>
      unwrap(
        api.GET("/api/providers/search", {
          params: {
            query: {
              clinicId,
              Search: search || undefined,
              Page: 1,
              PageSize: 100,
            },
          },
        }),
      ),
    enabled,
  });
}

export function usePatientById(id: string | undefined) {
  return useQuery({
    queryKey: ["patients", id],
    queryFn: () =>
      unwrap(
        api.GET("/api/patients/{id}", {
          params: { path: { id: id as string } },
        }),
      ),
    enabled: id !== undefined,
  });
}

export function createAppointment(id: string, input: AppointmentInput) {
  return unwrap(api.POST("/api/appointments", { body: { id, ...input } }));
}

export function updateAppointment(id: string, input: AppointmentInput) {
  return unwrap(
    api.PUT("/api/appointments/{id}", {
      params: { path: { id } },
      body: { id, ...input },
    }),
  );
}

export function deleteAppointment(id: string) {
  return unwrap(
    api.DELETE("/api/appointments/{id}", { params: { path: { id } } }),
  );
}

const transitions: Record<AppointmentAction, (id: string) => Promise<unknown>> =
  {
    confirm: (id) =>
      unwrap(
        api.POST("/api/appointments/{id}/confirm", {
          params: { path: { id } },
        }),
      ),
    decline: (id) =>
      unwrap(
        api.POST("/api/appointments/{id}/decline", {
          params: { path: { id } },
        }),
      ),
    complete: (id) =>
      unwrap(
        api.POST("/api/appointments/{id}/complete", {
          params: { path: { id } },
        }),
      ),
    cancel: (id) =>
      unwrap(
        api.POST("/api/appointments/{id}/cancel", {
          params: { path: { id } },
        }),
      ),
  };

export const transitionAppointment = (id: string, action: AppointmentAction) =>
  transitions[action](id);
