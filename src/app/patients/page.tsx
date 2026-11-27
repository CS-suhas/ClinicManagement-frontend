"use client";

import { useAuth } from "@/features/auth/auth-provider";
import { hasRole } from "@/features/auth/permissions";
import { AdminPatientsView } from "@/features/patients/components/admin-patients-view";
import { DoctorPatientsView } from "@/features/patients/components/doctor-patients-view";

export default function Page() {
  const { user, loading } = useAuth();
  if (loading || !user) return null;
  if (hasRole(user, "admin")) return <AdminPatientsView />;
  if (hasRole(user, "doctor"))
    return <DoctorPatientsView providerId={user.provider?.id ?? null} />;
  return null;
}
