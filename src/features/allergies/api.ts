import { useAuth } from "@/features/auth/auth-provider";
import { hasRole } from "@/features/auth/permissions";
import { pageQuery, usePagedList } from "@/hooks/use-paged-list";
import { $api, newId } from "@/lib/api";
import type { AllergyTypeForm } from "./schemas";

export function useAllergyTypeList() {
  return usePagedList((page) =>
    $api.queryOptions("get", "/api/allergy-types/search", {
      params: { query: pageQuery(page) },
    }),
  );
}

const ALLERGY_TYPE_CHANGES = ["allergy-types", "patients"] as const;

export function useSaveAllergyType() {
  const create = $api.useMutation("post", "/api/allergy-types", {
    meta: { invalidates: ALLERGY_TYPE_CHANGES, success: "Allergy added" },
  });
  const update = $api.useMutation("put", "/api/allergy-types/{id}", {
    meta: { invalidates: ALLERGY_TYPE_CHANGES, success: "Allergy saved" },
  });
  return (id: string | undefined, values: AllergyTypeForm) =>
    id
      ? update.mutateAsync({
          params: { path: { id } },
          body: { id, ...values },
        })
      : create.mutateAsync({ body: { id: newId(), ...values } });
}

export const useDeleteAllergyType = () =>
  $api.useMutation("delete", "/api/allergy-types/{id}", {
    meta: {
      invalidates: ["allergy-types"],
      success: "Allergy deleted",
      error: "Could not delete allergy",
    },
  });

export function useAllergyPatients(allergyId: string) {
  const { user } = useAuth();
  const allowed = hasRole(user, "admin", "clinicadmin", "doctor");
  const query = $api.useQuery(
    "get",
    "/api/allergy-types/{id}/patients",
    { params: { path: { id: allergyId } } },
    { enabled: allowed },
  );
  return { ...query, allowed };
}
