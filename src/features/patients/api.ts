import { useMutation, useQuery } from "@tanstack/react-query";
import { useNotify } from "@/components/notifications";
import { useAuth } from "@/features/auth/auth-provider";
import {
  PAGE_SIZE,
  type PageParams,
  usePagedList,
} from "@/hooks/use-paged-list";
import { ApiError, api, newId, type Schemas, unwrap } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type {
  AppointmentListItem,
  PatientForm,
  PatientSummary,
} from "./schemas";
import {
  groupVisitsByPatient,
  type PatientVisits,
  parseAllergySeverities,
} from "./utils";

const APPOINTMENT_PAGE_SIZE = 200;
const ALLERGY_PAGE = { Page: 1, PageSize: 100 };

const searchPatients = ({ search, page, pageSize }: PageParams) =>
  unwrap(
    api.GET("/api/patients/search", {
      params: { query: { Search: search, Page: page, PageSize: pageSize } },
    }),
  );

export function usePatientList() {
  return usePagedList(["patients"], searchPatients);
}

const NO_ROSTER: Schemas["PagedResponseOfProviderPatientRosterItem"] = {
  items: [],
  totalCount: 0,
  page: 1,
  pageSize: PAGE_SIZE,
};

export function useProviderRoster(providerId: string | null) {
  return usePagedList(
    ["patients", "roster", providerId],
    ({ search, page, pageSize }) =>
      providerId
        ? unwrap(
            api.GET("/api/providers/{id}/patients", {
              params: {
                path: { id: providerId },
                query: { Search: search, Page: page, PageSize: pageSize },
              },
            }),
          )
        : Promise.resolve(NO_ROSTER),
  );
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
    queryKey: ["patients", "visits", patientIds],
    queryFn: async (): Promise<Map<string, PatientVisits>> =>
      groupVisitsByPatient(
        patientIds.length === 0 ? [] : await fetchAllAppointments(),
        patientIds,
        Date.now(),
      ),
  });
}

export function useSavePatient() {
  const { notifySuccess, notifyError } = useNotify();
  return useMutation({
    mutationFn: ({ id, values }: { id?: string; values: PatientForm }) =>
      id
        ? unwrap(
            api.PUT("/api/patients/{id}", {
              params: { path: { id } },
              body: { id, ...values },
            }),
          )
        : unwrap(
            api.POST("/api/patients", { body: { id: newId(), ...values } }),
          ),
    onSuccess: (_, { id }) =>
      notifySuccess(id ? "Patient saved" : "Patient added"),
    onError: (e, { id }) =>
      notifyError(
        `Could not ${id ? "update" : "add"} patient: ${getErrorMessage(e)}`,
      ),
  });
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
    allergies.map((record) =>
      unwrap(
        api.DELETE("/api/patients/{id}/allergies/{allergyId}", {
          params: { path: { id, allergyId: record.allergyId } },
        }),
      ),
    ),
  );
  await unwrap(api.DELETE("/api/patients/{id}", { params: { path: { id } } }));
}

export function useDeletePatient() {
  const { notifySuccess, notifyError } = useNotify();
  return useMutation({
    mutationFn: deletePatient,
    onSuccess: () => notifySuccess("Patient deleted"),
    onError: (e) =>
      notifyError(`Could not delete patient: ${getErrorMessage(e)}`),
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

async function loadPatientSummary(patientId: string): Promise<PatientSummary> {
  try {
    const data = await unwrap(
      api.GET("/api/patients/{id}/summary", {
        params: { path: { id: patientId } },
      }),
    );
    return {
      patient: data.patient,
      allergies: data.allergies,
      lastVisit: data.lastVisit ?? null,
      nextVisit: data.nextVisit ?? null,
      counts: data.counts,
      recent: data.recent,
    };
  } catch (e) {
    if (e instanceof ApiError && (e.status === 403 || e.status === 404))
      return hiddenPatientSummary;
    throw e;
  }
}

export function usePatientSummary(patientId: string, enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["patients", patientId, "summary"],
    queryFn: () =>
      user ? loadPatientSummary(patientId) : hiddenPatientSummary,
    enabled,
  });
}

export function useAllergySeverities() {
  return useQuery({
    queryKey: ["allergy-severities"],
    queryFn: async () =>
      parseAllergySeverities(await unwrap(api.GET("/api/allergy-severities"))),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function usePatientAllergyList(patientId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["patients", patientId, "allergies"],
    queryFn: async () =>
      (
        await unwrap(
          api.GET("/api/patients/{id}/allergies/search", {
            params: { path: { id: patientId }, query: ALLERGY_PAGE },
          }),
        )
      ).items,
    enabled: enabled && patientId !== "",
  });
}

export function usePatientAllergyOptions(
  patientId: string,
  selectedAllergyId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [
      "patients",
      patientId,
      "allergy-options",
      selectedAllergyId ?? null,
    ],
    queryFn: () =>
      unwrap(
        api.GET("/api/patients/{id}/allergy-options", {
          params: {
            path: { id: patientId },
            query: { selectedAllergyId, ...ALLERGY_PAGE },
          },
        }),
      ),
    enabled: enabled && patientId !== "",
  });
}

type PatientAllergyWrite = {
  patientId: string;
  allergyId: string;
  severity: string;
  notes: string;
};

export function useAddPatientAllergy() {
  const { notifyError } = useNotify();
  return useMutation({
    mutationFn: ({
      patientId,
      allergyId,
      severity,
      notes,
    }: PatientAllergyWrite) =>
      unwrap(
        api.POST("/api/patients/{id}/allergies", {
          params: { path: { id: patientId } },
          body: { allergyId, severity, notes },
        }),
      ),
    onError: (e) => notifyError(`Could not add allergy: ${getErrorMessage(e)}`),
  });
}

export function useUpdatePatientAllergy() {
  const { notifyError } = useNotify();
  return useMutation({
    mutationFn: ({
      patientId,
      allergyId,
      severity,
      notes,
    }: PatientAllergyWrite) =>
      unwrap(
        api.PUT("/api/patients/{id}/allergies/{allergyId}", {
          params: { path: { id: patientId, allergyId } },
          body: { allergyId, severity, notes },
        }),
      ),
    onError: (e) =>
      notifyError(`Could not update allergy: ${getErrorMessage(e)}`),
  });
}

export function useRemovePatientAllergy() {
  const { notifyError } = useNotify();
  return useMutation({
    mutationFn: ({
      patientId,
      allergyId,
    }: {
      patientId: string;
      allergyId: string;
    }) =>
      unwrap(
        api.DELETE("/api/patients/{id}/allergies/{allergyId}", {
          params: { path: { id: patientId, allergyId } },
        }),
      ),
    onError: (e) =>
      notifyError(`Could not remove allergy: ${getErrorMessage(e)}`),
  });
}
