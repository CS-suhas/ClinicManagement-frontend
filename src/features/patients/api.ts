import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth-provider";
import { pageQuery, usePagedList } from "@/hooks/use-paged-list";
import { $api, api, byId, newId, orNull, unwrap } from "@/lib/api";
import { resourceKey } from "@/lib/query-client";
import type {
  AppointmentListItem,
  PatientForm,
  PatientSummary,
} from "./schemas";
import { groupVisitsByPatient, type PatientVisits } from "./utils";

const APPOINTMENT_PAGE_SIZE = 200;
const ALLERGY_PAGE = { Page: 1, PageSize: 100 };

export function usePatientList() {
  return usePagedList((page) =>
    $api.queryOptions("get", "/api/patients/search", {
      params: { query: pageQuery(page) },
    }),
  );
}

export function useProviderRoster(providerId: string | null) {
  return usePagedList((page) => ({
    ...$api.queryOptions("get", "/api/providers/{id}/patients", {
      params: { path: { id: providerId ?? "" }, query: pageQuery(page) },
    }),
    enabled: providerId !== null,
  }));
}

async function fetchAllAppointments(): Promise<AppointmentListItem[]> {
  const items: AppointmentListItem[] = [];
  for (let page = 1; ; page++) {
    const result = await unwrap(
      api.GET("/api/appointments/search", {
        params: { query: { Page: page, PageSize: APPOINTMENT_PAGE_SIZE } },
      }),
    );
    items.push(...result.items);
    if (result.items.length === 0 || items.length >= result.totalCount)
      return items;
  }
}

export function usePatientVisits(patientIds: string[]) {
  return useQuery({
    queryKey: resourceKey("appointments", "all"),
    queryFn: fetchAllAppointments,
    enabled: patientIds.length > 0,
    select: (appointments): Map<string, PatientVisits> =>
      groupVisitsByPatient(appointments, patientIds, Date.now()),
  });
}

const PATIENT_CHANGES = ["patients", "dashboard"] as const;

export function useSavePatient() {
  const create = $api.useMutation("post", "/api/patients", {
    meta: {
      invalidates: PATIENT_CHANGES,
      success: "Patient added",
      error: "Could not add patient",
    },
  });
  const update = $api.useMutation("put", "/api/patients/{id}", {
    meta: {
      invalidates: PATIENT_CHANGES,
      success: "Patient saved",
      error: "Could not update patient",
    },
  });
  return (id: string | undefined, values: PatientForm) =>
    id
      ? update.mutateAsync({
          params: { path: { id } },
          body: { id, ...values },
        })
      : create.mutateAsync({ body: { id: newId(), ...values } });
}

async function deletePatient(id: string) {
  const { totalCount } = await unwrap(
    api.GET("/api/appointments/search", {
      params: { query: { PatientId: id, Page: 1, PageSize: 1 } },
    }),
  );
  if (totalCount > 0)
    throw new Error(`Cannot delete: patient has ${totalCount} appointment(s).`);
  const allergies = await unwrap(
    api.GET("/api/patients/{id}/allergies", { params: { path: { id } } }),
  );
  await Promise.all(
    allergies.map(({ allergyId }) =>
      api.DELETE("/api/patients/{id}/allergies/{allergyId}", {
        params: { path: { id, allergyId } },
      }),
    ),
  );
  await api.DELETE("/api/patients/{id}", { params: { path: { id } } });
}

export function useDeletePatient() {
  return useMutation({
    meta: {
      invalidates: PATIENT_CHANGES,
      success: "Patient deleted",
      error: "Could not delete patient",
    },
    mutationFn: deletePatient,
  });
}

export const hiddenPatientSummary: PatientSummary = {
  patient: null,
  allergies: null,
  lastVisit: null,
  nextVisit: null,
  counts: null,
  recent: null,
};

export async function loadPatientSummary(
  patientId: string,
): Promise<PatientSummary> {
  const data = await orNull(() =>
    unwrap(api.GET("/api/patients/{id}/summary", byId(patientId))),
  );
  return { ...hiddenPatientSummary, ...data };
}

export function usePatientSummary(patientId: string, enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: resourceKey("patients", patientId, "summary", user?.subject),
    queryFn: () =>
      user ? loadPatientSummary(patientId) : hiddenPatientSummary,
    enabled,
  });
}

export function useAllergySeverities() {
  return $api.useQuery("get", "/api/allergy-severities", undefined, {
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function usePatientAllergyList(patientId: string, enabled: boolean) {
  return $api.useQuery(
    "get",
    "/api/patients/{id}/allergies/search",
    { params: { path: { id: patientId }, query: ALLERGY_PAGE } },
    { enabled: enabled && !!patientId, select: (page) => page.items },
  );
}

export function usePatientAllergyOptions(
  patientId: string,
  selectedAllergyId: string | undefined,
  enabled: boolean,
) {
  return $api.useQuery(
    "get",
    "/api/patients/{id}/allergy-options",
    {
      params: {
        path: { id: patientId },
        query: { selectedAllergyId, ...ALLERGY_PAGE },
      },
    },
    { enabled: enabled && !!patientId },
  );
}

const ALLERGY_CHANGES = ["patients", "allergy-types"] as const;

export const useAddPatientAllergy = () =>
  $api.useMutation("post", "/api/patients/{id}/allergies", {
    meta: { invalidates: ALLERGY_CHANGES, error: "Could not add allergy" },
  });

export const useUpdatePatientAllergy = () =>
  $api.useMutation("put", "/api/patients/{id}/allergies/{allergyId}", {
    meta: { invalidates: ALLERGY_CHANGES, error: "Could not update allergy" },
  });

export const useRemovePatientAllergy = () =>
  $api.useMutation("delete", "/api/patients/{id}/allergies/{allergyId}", {
    meta: { invalidates: ALLERGY_CHANGES, error: "Could not remove allergy" },
  });
