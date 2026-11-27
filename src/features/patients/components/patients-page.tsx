"use client";

import { useAuth } from "@/features/auth/auth-provider";
import { hasRole } from "@/features/auth/permissions";
import { AdminPatientsView } from "./admin-patients-view";
import { DoctorPatientsView } from "./doctor-patients-view";

export function PatientsPage() {
  const { user, loading } = useAuth();
  if (loading || !user) return null;
  if (hasRole(user, "admin")) return <AdminPatientsView />;
  if (hasRole(user, "doctor"))
    return <DoctorPatientsView providerId={user.provider?.id ?? null} />;
  return null;
}
