import { useMutation, useQuery } from "@tanstack/react-query";
import { useNotify } from "@/components/notifications";
import { useAuth } from "@/features/auth/auth-provider";
import { hasRole } from "@/features/auth/permissions";
import { type PageParams, usePagedList } from "@/hooks/use-paged-list";
import { ApiError, api, newId, type Schemas, unwrap } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { ClinicForm } from "./schemas";

const TOP_DOCTORS = 5;
const PREVIEW_DOCTORS = 8;
const DIRECTORY_PAGE_SIZE = 100;
const MAX_DIRECTORY_PAGES = 5;

export type ClinicDoctorRef = {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
};

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

const toDoctorRef = (doctor: Schemas["ProviderResponse"]): ClinicDoctorRef => ({
  id: doctor.id,
  firstName: doctor.firstName,
  lastName: doctor.lastName,
  specialty: doctor.specialty,
});

const isDenied = (e: unknown) =>
  e instanceof ApiError && (e.status === 403 || e.status === 404);

const searchClinics = ({ search, page, pageSize }: PageParams) =>
  unwrap(
    api.GET("/api/clinics/search", {
      params: { query: { Search: search, Page: page, PageSize: pageSize } },
    }),
  );

export function useClinicList() {
  return usePagedList(["clinics"], searchClinics);
}

export function useSaveClinic() {
  const { notifySuccess } = useNotify();
  return useMutation({
    meta: { invalidates: [["clinics"], ["providers"], ["dashboard"]] },
    mutationFn: ({ id, values }: { id?: string; values: ClinicForm }) =>
      id
        ? unwrap(
            api.PUT("/api/clinics/{id}", {
              params: { path: { id } },
              body: { id, ...values },
            }),
          )
        : unwrap(
            api.POST("/api/clinics", {
              body: { id: newId(), ...values },
            }),
          ),
    onSuccess: (_, { id }) =>
      notifySuccess(id ? "Clinic saved" : "Clinic added"),
  });
}

export function useDeleteClinic() {
  const { notifySuccess, notifyError } = useNotify();
  return useMutation({
    meta: { invalidates: [["clinics"], ["dashboard"]] },
    mutationFn: async (id: string) => {
      const { totalCount } = await unwrap(
        api.GET("/api/providers/search", {
          params: { query: { clinicId: id, Page: 1, PageSize: 1 } },
        }),
      );
      if (totalCount > 0)
        throw new Error(
          `Cannot delete: ${totalCount} provider(s) still belong to this clinic.`,
        );
      return unwrap(
        api.DELETE("/api/clinics/{id}", { params: { path: { id } } }),
      );
    },
    onSuccess: () => notifySuccess("Clinic deleted"),
    onError: (e) =>
      notifyError(`Could not delete clinic: ${getErrorMessage(e)}`),
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
    queryKey: ["clinics", "doctor-preview"],
    queryFn: fetchDoctorPreviews,
  });
}

async function fetchClinicSummary(
  clinicId: string,
  staff: boolean,
): Promise<ClinicSummary> {
  try {
    const data = await unwrap(
      api.GET("/api/clinics/{id}/summary", {
        params: { path: { id: clinicId } },
      }),
    );
    return {
      clinic: data.clinic,
      providerCount: data.providerCount,
      providers: data.providers.slice(0, TOP_DOCTORS).map(toDoctorRef),
      topSpecialties: data.topSpecialties,
      todayAppointmentCount: staff ? data.todayAppointmentCount : null,
    };
  } catch (e) {
    if (isDenied(e)) return EMPTY_SUMMARY;
    throw e;
  }
}

export function useClinicSummary(clinicId: string | null) {
  const { user } = useAuth();
  const staff =
    !!user &&
    (hasRole(user, "admin") ||
      (clinicId !== null && user.clinicAdminOf.includes(clinicId)));
  return useQuery({
    queryKey: ["clinics", clinicId, "summary", { signedIn: !!user, staff }],
    queryFn: () =>
      user && clinicId !== null
        ? fetchClinicSummary(clinicId, staff)
        : EMPTY_SUMMARY,
    enabled: clinicId !== null,
  });
}

export function useAllClinics(enabled = true) {
  return useQuery({
    queryKey: ["clinics", "all"],
    queryFn: () => unwrap(api.GET("/api/clinics")),
    enabled,
  });
}
