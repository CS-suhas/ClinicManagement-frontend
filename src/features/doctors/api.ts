import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError, api, newId, unwrap } from "@/lib/api";
import { addDays, toOffsetDateTime } from "@/lib/dates";
import { freeSlotStarts, localDayOf, slotCount } from "./utils";

const FREE_SLOT_SEARCH_DAYS = 7;

export async function unlessDenied<T>(
  read: () => Promise<T>,
): Promise<T | null> {
  try {
    return await read();
  } catch (e) {
    if (e instanceof ApiError && (e.status === 403 || e.status === 404))
      return null;
    throw e;
  }
}

export const fetchDirectory = (params: {
  search?: string;
  clinicId?: string;
  page: number;
  pageSize: number;
}) =>
  unwrap(
    api.GET("/api/providers/directory", {
      params: {
        query: {
          Search: params.search,
          clinicId: params.clinicId,
          Page: params.page,
          PageSize: params.pageSize,
        },
      },
    }),
  );

export const fetchClinics = () => unwrap(api.GET("/api/clinics"));

export const fetchAppointmentSettings = () =>
  unwrap(api.GET("/api/appointment-settings"));

export const fetchPatient = (id: string) =>
  unwrap(api.GET("/api/patients/{id}", { params: { path: { id } } }));

export const fetchProviderSummary = (providerId: string) =>
  unwrap(
    api.GET("/api/providers/{id}/summary", {
      params: { path: { id: providerId } },
    }),
  );

export async function fetchBusyStarts(providerId: string, date: string) {
  const raw = await unwrap(
    api.GET("/api/providers/{id}/busy-slots", {
      params: { path: { id: providerId }, query: { date } },
    }),
  );
  return raw.busyStartTimes;
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

export async function fetchNextFreeSlot(providerId: string) {
  const summary = await unlessDenied(() => fetchProviderSummary(providerId));
  if (!summary) return null;
  return resolveNextFreeSlot(
    providerId,
    summary.nextAvailableStart ?? null,
    Date.now(),
  );
}

export function useDirectory(clinicId: string) {
  return useQuery({
    queryKey: ["providers", "directory", { clinicId }],
    queryFn: () =>
      fetchDirectory({
        clinicId: clinicId || undefined,
        page: 1,
        pageSize: 100,
      }),
  });
}

export function useClinics() {
  return useQuery({
    queryKey: ["clinics", "list"],
    queryFn: fetchClinics,
  });
}

export function useBusyStarts(providerId: string | undefined, date: string) {
  return useQuery({
    queryKey: ["providers", providerId, "busy-starts", date],
    queryFn: () => fetchBusyStarts(providerId as string, date),
    enabled: !!providerId && !!date,
  });
}

export function useNextFreeSlot(providerId: string) {
  return useQuery({
    queryKey: ["providers", providerId, "next-free-slot"],
    queryFn: () => fetchNextFreeSlot(providerId),
  });
}

export function usePatient(id: string | undefined) {
  return useQuery({
    queryKey: ["patients", id],
    queryFn: () => fetchPatient(id as string),
    enabled: !!id,
  });
}

export function useBookAppointment() {
  return useMutation({
    mutationFn: ({
      patientId,
      providerId,
      dateTime,
      reasonForVisit,
    }: {
      patientId: string;
      providerId: string;
      dateTime: string;
      reasonForVisit: string;
    }) =>
      unwrap(
        api.POST("/api/appointments", {
          body: {
            id: newId(),
            patientId,
            providerId,
            appointmentDateTime: toOffsetDateTime(dateTime),
            reasonForVisit,
          },
        }),
      ),
  });
}

export function useCanViewProviderSchedule(providerId: string) {
  const { user } = useAuth();
  return (
    !!user &&
    (user.roles.includes("admin") ||
      (user.roles.includes("doctor") && user.provider?.id === providerId))
  );
}
