import { useAuth } from "@/features/auth/auth-provider";
import { hasRole } from "@/features/auth/permissions";
import { $api } from "@/lib/api";

export type PatientAccess =
  | { state: "checking" }
  | { state: "denied" }
  | { state: "allowed"; readOnly: boolean };

const useHasSeenPatient = (
  patientId: string,
  providerId: string,
  enabled: boolean,
) =>
  $api.useQuery(
    "get",
    "/api/appointments/search",
    {
      params: {
        query: {
          PatientId: patientId,
          ProviderId: providerId,
          Page: 1,
          PageSize: 1,
        },
      },
    },
    { enabled, select: (page) => page.totalCount > 0 },
  );

export function usePatientAccess(patientId: string): PatientAccess {
  const { user } = useAuth();
  const providerId = user?.provider?.id ?? null;
  const ownRecord = hasRole(user, "admin") || user?.patient?.id === patientId;
  const scoped =
    user !== null && !ownRecord && hasRole(user, "doctor") && !!providerId;
  const check = useHasSeenPatient(patientId, providerId ?? "", scoped);

  if (!user) return { state: "checking" };
  if (ownRecord) return { state: "allowed", readOnly: false };
  if (!scoped) return { state: "denied" };
  if (check.isPending) return { state: "checking" };
  return check.data
    ? { state: "allowed", readOnly: true }
    : { state: "denied" };
}

export const usePatientAppointments = (
  patientId: string,
  scopeProviderId: string | null,
) =>
  $api.useQuery(
    "get",
    "/api/appointments/search",
    {
      params: {
        query: {
          PatientId: patientId,
          ProviderId: scopeProviderId ?? undefined,
          Page: 1,
          PageSize: 50,
        },
      },
    },
    {
      select: ({ items }) =>
        items.toSorted(
          (a, b) =>
            Date.parse(b.appointmentDateTime) -
            Date.parse(a.appointmentDateTime),
        ),
    },
  );
