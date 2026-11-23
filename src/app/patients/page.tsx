"use client";

import { hasRole } from "@/application/auth/permissions";
import { useAuth } from "@/presentation/auth/auth-provider";
import { AdminPatientsView } from "@/presentation/features/patients/admin-patients-view";
import { DoctorPatientsView } from "@/presentation/features/patients/doctor-patients-view";

/** Admins manage every patient; doctors see the patients they have seen or booked. */
export default function Page() {
  const { user, loading } = useAuth();
  if (loading || !user) return null;
  if (hasRole(user, "admin")) return <AdminPatientsView />;
  if (hasRole(user, "doctor"))
    return <DoctorPatientsView providerId={user.provider?.id ?? null} />;
  return null;
}
