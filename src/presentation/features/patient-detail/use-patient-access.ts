"use client";

import { useEffect, useState } from "react";
import { hasRole } from "@/application/auth/permissions";
import { useService } from "@/di/container-provider";
import { useAuth } from "@/presentation/auth/auth-provider";

export type PatientAccess =
  | { state: "checking" }
  | { state: "denied" }
  /** `readOnly` is true for a doctor: they may read the record, not change it. */
  | { state: "allowed"; readOnly: boolean };

/**
 * Who may open a patient's record. Admins may open any. A patient may open their
 * own. A doctor may open only patients they have an appointment with, which the
 * appointment list answers. Everyone else is denied.
 */
export function usePatientAccess(patientId: string): PatientAccess {
  const appointmentService = useService("appointmentService");
  const { user } = useAuth();
  const signedIn = user !== null;
  const isAdmin = hasRole(user, "admin");
  const isDoctor = hasRole(user, "doctor");
  const providerId = user?.provider?.id ?? null;
  const ownPatientId = user?.patient?.id ?? null;
  const [access, setAccess] = useState<PatientAccess>({ state: "checking" });

  useEffect(() => {
    if (!signedIn) return;
    if (isAdmin || ownPatientId === patientId) {
      setAccess({ state: "allowed", readOnly: false });
      return;
    }
    if (!isDoctor || !providerId) {
      setAccess({ state: "denied" });
      return;
    }
    let current = true;
    setAccess({ state: "checking" });
    appointmentService
      .search({ patientId, providerId, page: 1, pageSize: 1 })
      .then((result) => {
        if (current)
          setAccess(
            result.totalCount > 0
              ? { state: "allowed", readOnly: true }
              : { state: "denied" },
          );
      })
      .catch(() => {
        if (current) setAccess({ state: "denied" });
      });
    return () => {
      current = false;
    };
  }, [
    signedIn,
    isAdmin,
    isDoctor,
    providerId,
    ownPatientId,
    patientId,
    appointmentService,
  ]);

  return access;
}
