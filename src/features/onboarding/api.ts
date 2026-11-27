import { $api, newId, type Schemas } from "@/lib/api";
import { PROVIDER_CHANGES } from "@/lib/query-client";
import type { PatientForm } from "./schemas";

export type ProviderRegistration = {
  clinicId: string;
  firstName: string;
  lastName: string;
  specialty: string;
  fee: number | null;
  gender: Schemas["Gender"] | null;
};

export function useCreatePatientProfile() {
  const create = $api.useMutation("post", "/api/me/patient", {
    meta: { invalidates: ["patients", "dashboard"] },
  });
  return (values: PatientForm) =>
    create.mutateAsync({ body: { id: newId(), ...values } });
}

export function useRegisterProvider() {
  const register = $api.useMutation("post", "/api/providers/register", {
    meta: { invalidates: PROVIDER_CHANGES },
  });
  return ({ fee, gender, ...values }: ProviderRegistration) =>
    register.mutateAsync({
      body: {
        id: newId(),
        ...values,
        fee: fee ?? undefined,
        gender: gender ?? undefined,
      },
    });
}
