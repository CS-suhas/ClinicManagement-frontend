import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth-provider";
import { hasRole } from "@/features/auth/permissions";
import type { CurrentUser } from "@/features/auth/schemas";
import { ApiError, api, type Schemas, unwrap } from "@/lib/api";
import { addDays } from "@/lib/dates";
import { PROVIDER_KEYS } from "@/lib/query-client";
import {
  type AppointmentSettings,
  freeSlotStarts,
  localDayOf,
  slotCount,
} from "./utils";

const SLOT_SEARCH_DAYS = 7;

export type PatientGlance = {
  patient: Schemas["PatientSummaryPatient"] | null;
  allergies: Schemas["PatientSummaryAllergy"][] | null;
  lastVisit: Schemas["PatientVisitResponse"] | null;
  nextVisit: Schemas["PatientVisitResponse"] | null;
  counts: Schemas["PatientVisitCounts"] | null;
  recent: Schemas["PatientVisitResponse"][] | null;
};

export type DoctorGlance = {
  provider: Schemas["ProviderResponse"] | null;
  clinic: Schemas["ClinicResponse"] | null;
  todayAppointmentCount: number | null;
  todaySlots: { busy: number; total: number } | null;
  nextAvailableStart: string | null;
  patientCount: number | null;
};

export type ClinicGlance = {
  clinic: Schemas["ClinicResponse"] | null;
  providerCount: number;
  providers: Schemas["ProviderResponse"][];
  topSpecialties: string[];
  todayAppointmentCount: number | null;
};

export type AllergyGlance = {
  patientCount: number;
};

const hiddenPatient: PatientGlance = {
  patient: null,
  allergies: null,
  lastVisit: null,
  nextVisit: null,
  counts: null,
  recent: null,
};

const emptyClinic: ClinicGlance = {
  clinic: null,
  providerCount: 0,
  providers: [],
  topSpecialties: [],
  todayAppointmentCount: null,
};

const isForbidden = (e: unknown) => e instanceof ApiError && e.status === 403;

const isDenied = (e: unknown) =>
  e instanceof ApiError && (e.status === 403 || e.status === 404);

async function orNull<T>(
  read: () => Promise<T>,
  ignore: (e: unknown) => boolean,
): Promise<T | null> {
  try {
    return await read();
  } catch (e) {
    if (ignore(e)) return null;
    throw e;
  }
}

async function loadPatientGlance(
  patientId: string,
  user: CurrentUser | null,
): Promise<PatientGlance> {
  if (!user) return hiddenPatient;
  const data = await orNull(
    () =>
      unwrap(
        api.GET("/api/patients/{id}/summary", {
          params: { path: { id: patientId } },
        }),
      ),
    isDenied,
  );
  if (!data) return hiddenPatient;
  return {
    patient: data.patient,
    allergies: data.allergies,
    lastVisit: data.lastVisit ?? null,
    nextVisit: data.nextVisit ?? null,
    counts: data.counts,
    recent: data.recent,
  };
}

export function usePatientGlance(patientId: string, enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["patients", patientId, "glance", user?.subject ?? null],
    queryFn: () => loadPatientGlance(patientId, user),
    enabled,
  });
}

async function fetchAppointmentSettings(): Promise<AppointmentSettings> {
  return unwrap(api.GET("/api/appointment-settings"));
}

async function fetchBusyStarts(
  providerId: string,
  date: string,
): Promise<string[]> {
  const response = await unwrap(
    api.GET("/api/providers/{id}/busy-slots", {
      params: { path: { id: providerId }, query: { date } },
    }),
  );
  return response.busyStartTimes;
}

async function todaySlots(
  providerId: string,
  today: string,
): Promise<{ busy: number; total: number } | null> {
  try {
    const settings = await fetchAppointmentSettings();
    const busy = await fetchBusyStarts(providerId, today);
    return { busy: busy.length, total: slotCount(settings) };
  } catch {
    return null;
  }
}

async function nextFreeSlot(
  providerId: string,
  serverHint: string | null,
  now: number,
): Promise<string | null> {
  if (serverHint) return serverHint;
  try {
    const settings = await fetchAppointmentSettings();
    const today = localDayOf(now);
    for (let offset = 0; offset < SLOT_SEARCH_DAYS; offset++) {
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

async function loadDoctorGlance(
  providerId: string,
  user: CurrentUser | null,
): Promise<DoctorGlance> {
  const data = await orNull(
    () =>
      unwrap(
        api.GET("/api/providers/{id}/summary", {
          params: { path: { id: providerId } },
        }),
      ),
    isDenied,
  );
  const provider = data?.provider ?? null;
  const clinicId = provider?.clinicId ?? null;
  const seesSchedule =
    !!user &&
    (hasRole(user, "admin") ||
      (hasRole(user, "doctor") && user.provider?.id === providerId) ||
      (clinicId !== null && user.clinicAdminOf.includes(clinicId)));
  const now = Date.now();
  const [slots, patientCount, nextAvailableStart] = await Promise.all([
    data ? todaySlots(providerId, localDayOf(now)) : null,
    seesSchedule
      ? orNull(
          () =>
            unwrap(
              api.GET("/api/providers/{id}/patients", {
                params: {
                  path: { id: providerId },
                  query: { Page: 1, PageSize: 1 },
                },
              }),
            ).then((roster) => roster.totalCount),
          isForbidden,
        )
      : null,
    data ? nextFreeSlot(providerId, data.nextAvailableStart, now) : null,
  ]);
  return {
    provider,
    clinic: data?.clinic ?? null,
    todayAppointmentCount: seesSchedule
      ? (data?.todayAppointmentCount ?? null)
      : null,
    todaySlots: slots,
    nextAvailableStart,
    patientCount,
  };
}

export function useDoctorGlance(providerId: string, enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["providers", providerId, "glance", user?.subject ?? null],
    queryFn: () => loadDoctorGlance(providerId, user),
    enabled,
  });
}

async function loadClinicGlance(
  clinicId: string,
  user: CurrentUser | null,
): Promise<ClinicGlance> {
  if (!user) return emptyClinic;
  const data = await orNull(
    () =>
      unwrap(
        api.GET("/api/clinics/{id}/summary", {
          params: { path: { id: clinicId } },
        }),
      ),
    isDenied,
  );
  if (!data) return emptyClinic;
  const isStaff =
    hasRole(user, "admin") || user.clinicAdminOf.includes(clinicId);
  return {
    clinic: data.clinic,
    providerCount: data.providerCount,
    providers: data.providers.slice(0, 5),
    topSpecialties: data.topSpecialties,
    todayAppointmentCount: isStaff ? data.todayAppointmentCount : null,
  };
}

export function useClinicGlance(clinicId: string, enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["clinics", clinicId, "glance", user?.subject ?? null],
    queryFn: () => loadClinicGlance(clinicId, user),
    enabled,
  });
}

async function loadAllergyGlance(
  allergyId: string,
  user: CurrentUser | null,
): Promise<AllergyGlance | null> {
  const allowed =
    !!user &&
    (hasRole(user, "admin") ||
      hasRole(user, "clinicadmin") ||
      hasRole(user, "doctor"));
  if (!allowed) return null;
  const patients = await orNull(
    () =>
      unwrap(
        api.GET("/api/allergy-types/{id}/patients", {
          params: { path: { id: allergyId } },
        }),
      ),
    isForbidden,
  );
  if (!patients) return null;
  return { patientCount: patients.length };
}

export function useAllergyGlance(allergyId: string, enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["allergy-types", allergyId, "glance", user?.subject ?? null],
    queryFn: () => loadAllergyGlance(allergyId, user),
    enabled,
  });
}

export function useProviderDecision() {
  return useMutation({
    meta: { invalidates: PROVIDER_KEYS },
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: "verify" | "reject";
    }) =>
      action === "verify"
        ? unwrap(
            api.POST("/api/providers/{id}/verify", {
              params: { path: { id } },
            }),
          )
        : unwrap(
            api.POST("/api/providers/{id}/reject", {
              params: { path: { id } },
            }),
          ),
  });
}
