import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth-provider";
import { hasRole } from "@/features/auth/permissions";
import { $api, api, byId, newId, orNull, unwrap } from "@/lib/api";
import { addDays, toOffsetDateTime } from "@/lib/dates";
import { APPOINTMENT_CHANGES, resourceKey } from "@/lib/query-client";
import { freeSlotStarts, localDayOf, slotCount } from "./utils";

const FREE_SLOT_SEARCH_DAYS = 7;

export const fetchAppointmentSettings = () =>
  unwrap(api.GET("/api/appointment-settings"));

export const fetchProviderSummary = (providerId: string) =>
  unwrap(api.GET("/api/providers/{id}/summary", byId(providerId)));

export async function fetchBusyStarts(providerId: string, date: string) {
  const { busyStartTimes } = await unwrap(
    api.GET("/api/providers/{id}/busy-slots", {
      params: { path: { id: providerId }, query: { date } },
    }),
  );
  return busyStartTimes;
}

export async function fetchProviderBusyCount(
  providerId: string,
  today: string,
) {
  try {
    const settings = await fetchAppointmentSettings();
    const busy = await fetchBusyStarts(providerId, today);
    return { busy: busy.length, total: slotCount(settings) };
  } catch {
    return null;
  }
}

export async function resolveNextFreeSlot(
  providerId: string,
  serverHint: string | null,
  now: number,
): Promise<string | null> {
  if (serverHint) return serverHint;
  try {
    const settings = await fetchAppointmentSettings();
    const today = localDayOf(now);
    for (let offset = 0; offset < FREE_SLOT_SEARCH_DAYS; offset++) {
      const day = addDays(today, offset);
      const busy = await fetchBusyStarts(providerId, day);
      const free = freeSlotStarts(settings, day, busy, now)[0];
      if (free) return free;
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchNextFreeSlot(providerId: string) {
  const summary = await orNull(() => fetchProviderSummary(providerId));
  if (!summary) return null;
  return resolveNextFreeSlot(
    providerId,
    summary.nextAvailableStart ?? null,
    Date.now(),
  );
}

export const useDirectory = (clinicId: string) =>
  $api.useQuery("get", "/api/providers/directory", {
    params: {
      query: { clinicId: clinicId || undefined, Page: 1, PageSize: 100 },
    },
  });

export const useBusyStarts = (providerId: string | undefined, date: string) =>
  $api.useQuery(
    "get",
    "/api/providers/{id}/busy-slots",
    { params: { path: { id: providerId ?? "" }, query: { date } } },
    { enabled: !!providerId && !!date, select: (r) => r.busyStartTimes },
  );

export function useNextFreeSlot(providerId: string) {
  return useQuery({
    queryKey: resourceKey("providers", providerId, "next-free-slot"),
    queryFn: () => fetchNextFreeSlot(providerId),
  });
}

export const usePatient = (id: string | undefined) =>
  $api.useQuery("get", "/api/patients/{id}", byId(id ?? ""), {
    enabled: !!id,
  });

export function useBookAppointment() {
  const book = $api.useMutation("post", "/api/appointments", {
    meta: { invalidates: APPOINTMENT_CHANGES },
  });
  return {
    isPending: book.isPending,
    mutateAsync: ({
      dateTime,
      ...booking
    }: {
      patientId: string;
      providerId: string;
      dateTime: string;
      reasonForVisit: string;
    }) =>
      book.mutateAsync({
        body: {
          id: newId(),
          ...booking,
          appointmentDateTime: toOffsetDateTime(dateTime),
        },
      }),
  };
}

export function useCanViewProviderSchedule(providerId: string) {
  const { user } = useAuth();
  return (
    hasRole(user, "admin") ||
    (hasRole(user, "doctor") && user?.provider?.id === providerId)
  );
}
