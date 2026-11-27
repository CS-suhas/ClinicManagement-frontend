import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { $api, api, byId, unwrap } from "@/lib/api";
import { localMidnightIso } from "@/lib/dates";
import { resourceKey } from "@/lib/query-client";
import {
  type AppointmentAction,
  type AppointmentInput,
  type AppointmentListItem,
  appointmentSettingsSchema,
} from "./schemas";
import { type AppointmentScope, scopeFilter } from "./utils";

const PAGE_SIZE = 100;
const MAX_PAGES = 20;
const PENDING_PAGE_SIZE = 50;
const OPTIONS_PAGE = { Page: 1, PageSize: 100 };

export type DateRange = { from: string; to: string };

const byStart = (a: AppointmentListItem, b: AppointmentListItem) =>
  Date.parse(a.appointmentDateTime) - Date.parse(b.appointmentDateTime);

async function fetchRange(scope: AppointmentScope, range: DateRange) {
  const filter = scopeFilter(scope);
  if (!filter) return [];
  const found: AppointmentListItem[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await unwrap(
      api.GET("/api/appointments/search", {
        params: {
          query: {
            From: range.from,
            To: range.to,
            ClinicId: filter.clinicId,
            ProviderId: filter.providerId,
            PatientId: filter.patientId,
            Page: page,
            PageSize: PAGE_SIZE,
          },
        },
      }),
    );
    found.push(...result.items);
    if (result.items.length < PAGE_SIZE || found.length >= result.totalCount)
      break;
  }
  return found.sort(byStart);
}

export function useAppointmentRange(
  range: DateRange | null,
  scope: AppointmentScope,
) {
  return useQuery({
    queryKey: resourceKey(
      "appointments",
      "range",
      range?.from,
      range?.to,
      scope,
    ),
    queryFn: () => (range ? fetchRange(scope, range) : []),
    enabled: range !== null,
    placeholderData: keepPreviousData,
  });
}

export const usePendingRequestsQuery = (
  providerId: string | null,
  todayKey: string | null,
) =>
  $api.useQuery(
    "get",
    "/api/appointments/search",
    {
      params: {
        query: {
          ProviderId: providerId ?? undefined,
          Status: "REQUESTED",
          From: todayKey ? localMidnightIso(todayKey) : undefined,
          Page: 1,
          PageSize: PENDING_PAGE_SIZE,
        },
      },
    },
    { enabled: !!providerId && !!todayKey },
  );

export const useAppointmentSettings = () =>
  $api.useQuery("get", "/api/appointment-settings", undefined, {
    select: (raw) => {
      const parsed = appointmentSettingsSchema.safeParse(raw);
      if (!parsed.success)
        throw new Error("The API returned invalid appointment settings.");
      return parsed.data;
    },
  });

export const useProviders = (enabled: boolean) =>
  $api.useQuery("get", "/api/providers", undefined, { enabled });

export const usePatientOptions = (search: string) =>
  $api.useQuery("get", "/api/patients/search", {
    params: { query: { Search: search || undefined, ...OPTIONS_PAGE } },
  });

export const useProviderOptions = (clinicId: string, search: string) =>
  $api.useQuery(
    "get",
    "/api/providers/search",
    {
      params: {
        query: { clinicId, Search: search || undefined, ...OPTIONS_PAGE },
      },
    },
    { enabled: clinicId !== "" },
  );

export const usePatientById = (id: string | undefined) =>
  $api.useQuery("get", "/api/patients/{id}", byId(id ?? ""), {
    enabled: id !== undefined,
  });

export const createAppointment = (id: string, input: AppointmentInput) =>
  api.POST("/api/appointments", { body: { id, ...input } });

export const updateAppointment = (id: string, input: AppointmentInput) =>
  api.PUT("/api/appointments/{id}", { ...byId(id), body: { id, ...input } });

export const deleteAppointment = (id: string) =>
  api.DELETE("/api/appointments/{id}", byId(id));

const transitions = {
  confirm: (id: string) => api.POST("/api/appointments/{id}/confirm", byId(id)),
  decline: (id: string) => api.POST("/api/appointments/{id}/decline", byId(id)),
  complete: (id: string) =>
    api.POST("/api/appointments/{id}/complete", byId(id)),
  cancel: (id: string) => api.POST("/api/appointments/{id}/cancel", byId(id)),
} satisfies Record<AppointmentAction, (id: string) => Promise<unknown>>;

export const transitionAppointment = (id: string, action: AppointmentAction) =>
  transitions[action](id);
