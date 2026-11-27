import { useMutation, useQuery } from "@tanstack/react-query";
import { api, newId, unwrap } from "@/lib/api";
import type { PatientForm } from "./schemas";

export type ProviderRegistration = {
  clinicId: string;
  firstName: string;
  lastName: string;
  specialty: string;
  fee: number | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
};

export function useCreatePatientProfile() {
  return useMutation({
    mutationFn: (values: PatientForm) =>
      unwrap(
        api.POST("/api/me/patient", {
          body: { id: newId(), ...values },
        }),
      ),
  });
}

export function useRegisterProvider() {
  return useMutation({
    mutationFn: (values: ProviderRegistration) =>
      unwrap(
        api.POST("/api/providers/register", {
          body: {
            id: newId(),
            ...values,
            fee: values.fee ?? undefined,
            gender: values.gender ?? undefined,
          },
        }),
      ),
  });
}

export function useClinicOptions(search: string) {
  return useQuery({
    queryKey: ["clinics", "options", { search }],
    queryFn: () =>
      unwrap(
        api.GET("/api/clinics/search", {
          params: {
            query: { Search: search || undefined, Page: 1, PageSize: 100 },
          },
        }),
      ),
  });
}
