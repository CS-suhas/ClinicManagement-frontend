import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth-provider";
import { hasRole } from "@/features/auth/permissions";
import { pageQuery, usePagedList } from "@/hooks/use-paged-list";
import {
  $api,
  api,
  byId,
  newId,
  orNull,
  type Schemas,
  unwrap,
} from "@/lib/api";
import { resourceKey } from "@/lib/query-client";
import type { ClinicForm } from "./schemas";

const TOP_DOCTORS = 5;
const PREVIEW_DOCTORS = 8;
const DIRECTORY_PAGE_SIZE = 100;
const MAX_DIRECTORY_PAGES = 5;

export type ClinicDoctorRef = Pick<
  Schemas["ProviderResponse"],
  "id" | "firstName" | "lastName" | "specialty"
>;

export type ClinicDoctorPreview = {
  count: number;
  doctors: ClinicDoctorRef[];
};

export type ClinicSummary = {
  clinic: Schemas["ClinicResponse"] | null;
  providerCount: number;
  providers: ClinicDoctorRef[];
  topSpecialties: string[];
  todayAppointmentCount: number | null;
};

const EMPTY_SUMMARY: ClinicSummary = {
  clinic: null,
  providerCount: 0,
  providers: [],
  topSpecialties: [],
  todayAppointmentCount: null,
};

const toDoctorRef = ({
  id,
  firstName,
  lastName,
  specialty,
}: ClinicDoctorRef): ClinicDoctorRef => ({
  id,
  firstName,
  lastName,
  specialty,
});

export function useClinicList() {
  return usePagedList((page) =>
    $api.queryOptions("get", "/api/clinics/search", {
      params: { query: pageQuery(page) },
    }),
  );
}

export function useSaveClinic() {
  const invalidates = ["clinics", "providers", "dashboard"] as const;
  const create = $api.useMutation("post", "/api/clinics", {
    meta: { invalidates, success: "Clinic added" },
  });
  const update = $api.useMutation("put", "/api/clinics/{id}", {
    meta: { invalidates, success: "Clinic saved" },
  });
  return (id: string | undefined, values: ClinicForm) =>
    id
      ? update.mutateAsync({
          params: { path: { id } },
          body: { id, ...values },
        })
      : create.mutateAsync({ body: { id: newId(), ...values } });
}

async function deleteClinic(id: string) {
  const { totalCount } = await unwrap(
    api.GET("/api/providers/search", {
      params: { query: { clinicId: id, Page: 1, PageSize: 1 } },
    }),
  );
  if (totalCount > 0)
    throw new Error(
      `Cannot delete: ${totalCount} provider(s) still belong to this clinic.`,
    );
  await api.DELETE("/api/clinics/{id}", byId(id));
}

export function useDeleteClinic() {
  return useMutation({
    meta: {
      invalidates: ["clinics", "dashboard"],
      success: "Clinic deleted",
      error: "Could not delete clinic",
    },
    mutationFn: deleteClinic,
  });
}

async function fetchDoctorPreviews(): Promise<
  Record<string, ClinicDoctorPreview>
> {
  const doctors: Schemas["ProviderResponse"][] = [];
  for (let page = 1; page <= MAX_DIRECTORY_PAGES; page++) {
    const result = await unwrap(
      api.GET("/api/providers/directory", {
        params: { query: { Page: page, PageSize: DIRECTORY_PAGE_SIZE } },
      }),
    );
    doctors.push(...result.items);
    if (doctors.length >= result.totalCount || result.items.length === 0) break;
  }
  const byClinic: Record<string, ClinicDoctorPreview> = {};
  for (const doctor of doctors) {
    const preview = byClinic[doctor.clinicId] ?? { count: 0, doctors: [] };
    preview.count++;
    if (preview.doctors.length < PREVIEW_DOCTORS)
      preview.doctors.push(toDoctorRef(doctor));
    byClinic[doctor.clinicId] = preview;
  }
  return byClinic;
}

export function useClinicDoctorPreview() {
  return useQuery({
    queryKey: resourceKey("clinics", "doctor-preview"),
    queryFn: fetchDoctorPreviews,
  });
}

async function fetchClinicSummary(
  clinicId: string,
  staff: boolean,
): Promise<ClinicSummary> {
  const data = await orNull(() =>
    unwrap(api.GET("/api/clinics/{id}/summary", byId(clinicId))),
  );
  if (!data) return EMPTY_SUMMARY;
  return {
    ...data,
    providers: data.providers.slice(0, TOP_DOCTORS).map(toDoctorRef),
    todayAppointmentCount: staff ? data.todayAppointmentCount : null,
  };
}

export function useClinicSummary(clinicId: string | null, enabled = true) {
  const { user } = useAuth();
  const staff =
    hasRole(user, "admin") ||
    (clinicId !== null && !!user?.clinicAdminOf.includes(clinicId));
  return useQuery({
    queryKey: resourceKey("clinics", clinicId, "summary", user?.subject, staff),
    queryFn: () =>
      user && clinicId !== null
        ? fetchClinicSummary(clinicId, staff)
        : EMPTY_SUMMARY,
    enabled: enabled && clinicId !== null,
  });
}

export const useClinicOptions = (search: string) =>
  $api.useQuery("get", "/api/clinics/search", {
    params: { query: { Search: search || undefined, Page: 1, PageSize: 100 } },
  });

export const useAllClinics = (enabled = true) =>
  $api.useQuery("get", "/api/clinics", undefined, { enabled });
