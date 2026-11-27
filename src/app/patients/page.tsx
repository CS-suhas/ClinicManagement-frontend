"use client";

import { hasRole } from "@/application/auth/permissions";
import { useAuth } from "@/features/auth/auth-provider";
import { AdminPatientsView } from "@/features/patients/components/admin-patients-view";
import { DoctorPatientsView } from "@/features/patients/components/doctor-patients-view";

/** Admins manage every patient; doctors see the patients they have seen or booked. */
export default function Page() {
  const { user, loading } = useAuth();
  if (loading || !user) return null;
  if (hasRole(user, "admin")) return <AdminPatientsView />;
  if (hasRole(user, "doctor"))
    return <DoctorPatientsView providerId={user.provider?.id ?? null} />;
  return null;
}
