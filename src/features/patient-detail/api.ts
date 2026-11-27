import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth-provider";
import { hasRole } from "@/features/auth/permissions";
import { api, unwrap } from "@/lib/api";

export type PatientAccess =
  | { state: "checking" }
  | { state: "denied" }
  | { state: "allowed"; readOnly: boolean };

function useDoctorPatientAccess(
  patientId: string,
  providerId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["patients", patientId, "access", providerId],
    queryFn: async () => {
      try {
        const result = await unwrap(
          api.GET("/api/appointments/search", {
            params: {
              query: {
                PatientId: patientId,
                ProviderId: providerId,
                Page: 1,
                PageSize: 1,
              },
            },
          }),
        );
        return result.totalCount > 0;
      } catch {
        return false;
      }
    },
    enabled,
  });
}

export function usePatientAccess(patientId: string): PatientAccess {
  const { user } = useAuth();
  const isAdmin = hasRole(user, "admin");
  const isDoctor = hasRole(user, "doctor");
  const providerId = user?.provider?.id ?? null;
  const ownRecord = isAdmin || user?.patient?.id === patientId;
  const scoped = user !== null && !ownRecord && isDoctor && providerId !== null;
  const check = useDoctorPatientAccess(patientId, providerId ?? "", scoped);

  if (!user) return { state: "checking" };
  if (ownRecord) return { state: "allowed", readOnly: false };
  if (!scoped) return { state: "denied" };
  if (check.isPending) return { state: "checking" };
  return check.data
    ? { state: "allowed", readOnly: true }
    : { state: "denied" };
}

export function usePatientAppointments(
  patientId: string,
  scopeProviderId: string | null,
) {
  return useQuery({
    queryKey: ["patients", patientId, "appointments", scopeProviderId],
    queryFn: async () => {
      const result = await unwrap(
        api.GET("/api/appointments/search", {
          params: {
            query: {
              PatientId: patientId,
              ProviderId: scopeProviderId ?? undefined,
              Page: 1,
              PageSize: 50,
            },
          },
        }),
      );
      return [...result.items].sort(
        (a, b) =>
          Date.parse(b.appointmentDateTime) - Date.parse(a.appointmentDateTime),
      );
    },
  });
}
