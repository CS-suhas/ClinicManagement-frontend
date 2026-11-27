import { useMutation, useQuery } from "@tanstack/react-query";
import { useNotify } from "@/components/notifications";
import { useAuth } from "@/features/auth/auth-provider";
import { hasRole } from "@/features/auth/permissions";
import { type PageParams, usePagedList } from "@/hooks/use-paged-list";
import { api, newId, unwrap } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { AllergyTypeForm } from "./schemas";

const searchAllergyTypes = ({ search, page, pageSize }: PageParams) =>
  unwrap(
    api.GET("/api/allergy-types/search", {
      params: { query: { Search: search, Page: page, PageSize: pageSize } },
    }),
  );

export function useAllergyTypeList() {
  return usePagedList(["allergy-types"], searchAllergyTypes);
}

export function useSaveAllergyType() {
  const { notifySuccess } = useNotify();
  return useMutation({
    meta: { invalidates: [["allergy-types"], ["patients"]] },
    mutationFn: ({ id, values }: { id?: string; values: AllergyTypeForm }) =>
      id
        ? unwrap(
            api.PUT("/api/allergy-types/{id}", {
              params: { path: { id } },
              body: { id, ...values },
            }),
          )
        : unwrap(
            api.POST("/api/allergy-types", {
              body: { id: newId(), ...values },
            }),
          ),
    onSuccess: (_, { id }) =>
      notifySuccess(id ? "Allergy saved" : "Allergy added"),
  });
}

export function useDeleteAllergyType() {
  const { notifySuccess, notifyError } = useNotify();
  return useMutation({
    meta: { invalidates: [["allergy-types"]] },
    mutationFn: (id: string) =>
      unwrap(
        api.DELETE("/api/allergy-types/{id}", { params: { path: { id } } }),
      ),
    onSuccess: () => notifySuccess("Allergy deleted"),
    onError: (e) =>
      notifyError(`Could not delete allergy: ${getErrorMessage(e)}`),
  });
}

export function useAllergyPatients(allergyId: string) {
  const { user } = useAuth();
  const allowed =
    !!user &&
    (hasRole(user, "admin") ||
      hasRole(user, "clinicadmin") ||
      hasRole(user, "doctor"));
  const query = useQuery({
    queryKey: ["allergy-types", allergyId, "patients"],
    queryFn: () =>
      unwrap(
        api.GET("/api/allergy-types/{id}/patients", {
          params: { path: { id: allergyId } },
        }),
      ),
    enabled: allowed,
  });
  return { ...query, allowed };
}
