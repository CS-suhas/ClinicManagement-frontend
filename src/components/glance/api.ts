import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth-provider";
import { hasRole } from "@/features/auth/permissions";
import type { CurrentUser } from "@/features/auth/schemas";
import { useClinicSummary } from "@/features/clinics/api";
import {
  fetchProviderBusyCount,
  fetchProviderSummary,
  resolveNextFreeSlot,
} from "@/features/doctors/api";
import { localDayOf } from "@/features/doctors/utils";
import { usePatientSummary } from "@/features/patients/api";
import {
  api,
  byId,
  isForbidden,
  orNull,
  type Schemas,
  unwrap,
} from "@/lib/api";
import { resourceKey } from "@/lib/query-client";

export type DoctorGlance = {
  provider: Schemas["ProviderResponse"] | null;
  clinic: Schemas["ClinicResponse"] | null;
  todayAppointmentCount: number | null;
  todaySlots: { busy: number; total: number } | null;
  nextAvailableStart: string | null;
  patientCount: number | null;
};

export const usePatientGlance = usePatientSummary;

export const useClinicGlance = useClinicSummary;

async function loadDoctorGlance(
  providerId: string,
  user: CurrentUser | null,
): Promise<DoctorGlance> {
  const data = await orNull(() => fetchProviderSummary(providerId));
  const provider = data?.provider ?? null;
  const clinicId = provider?.clinicId ?? null;
  const seesSchedule =
    hasRole(user, "admin") ||
    (hasRole(user, "doctor") && user?.provider?.id === providerId) ||
    (clinicId !== null && !!user?.clinicAdminOf.includes(clinicId));
  const now = Date.now();
  const [todaySlots, patientCount, nextAvailableStart] = await Promise.all([
    data ? fetchProviderBusyCount(providerId, localDayOf(now)) : null,
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
    data ? resolveNextFreeSlot(providerId, data.nextAvailableStart, now) : null,
  ]);
  return {
    provider,
    clinic: data?.clinic ?? null,
    todayAppointmentCount: seesSchedule
      ? (data?.todayAppointmentCount ?? null)
      : null,
    todaySlots,
    nextAvailableStart,
    patientCount,
  };
}

export function useDoctorGlance(providerId: string, enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: resourceKey("providers", providerId, "glance", user?.subject),
    queryFn: () => loadDoctorGlance(providerId, user),
    enabled,
  });
}

async function loadAllergyPatientCount(allergyId: string) {
  const patients = await orNull(
    () => unwrap(api.GET("/api/allergy-types/{id}/patients", byId(allergyId))),
    isForbidden,
  );
  return patients && { patientCount: patients.length };
}

export function useAllergyGlance(allergyId: string, enabled: boolean) {
  const { user } = useAuth();
  const allowed = hasRole(user, "admin", "clinicadmin", "doctor");
  return useQuery({
    queryKey: resourceKey("allergy-types", allergyId, "glance", user?.subject),
    queryFn: () => (allowed ? loadAllergyPatientCount(allergyId) : null),
    enabled,
  });
}
