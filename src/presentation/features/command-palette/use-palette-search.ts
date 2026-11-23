"use client";

import { useEffect, useState } from "react";
import { hasRole } from "@/application/auth/permissions";
import { useService } from "@/di/container-provider";
import type { CurrentUser } from "@/domain/auth";
import { patientFullName, providerFullName } from "@/domain/entities";

export const PALETTE_DEBOUNCE_MS = 200;
const MIN_QUERY_LENGTH = 2;
const RESULTS_PER_GROUP = 5;

export interface PaletteEntity {
  id: string;
  name: string;
  detail?: string;
}

export interface PaletteRemoteResults {
  patients: PaletteEntity[];
  doctors: PaletteEntity[];
  clinics: PaletteEntity[];
}

const EMPTY: PaletteRemoteResults = { patients: [], doctors: [], clinics: [] };

/**
 * Debounced people and place search for the palette. Each source is read
 * separately, so one failing source leaves the others. Stale responses are
 * dropped when the query changes. Patients are searched only where the role
 * may list them: all for admins, the doctor's own patients for doctors.
 */
export function usePaletteSearch(
  query: string,
  user: CurrentUser | null,
  enabled: boolean,
) {
  const patientService = useService("patientService");
  const providerService = useService("providerService");
  const clinicService = useService("clinicService");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<PaletteRemoteResults>(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(
      () => setDebounced(query.trim()),
      PALETTE_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [query]);

  const subject = user?.subject ?? null;
  const isAdmin = hasRole(user, "admin");
  const isDoctor = hasRole(user, "doctor");
  const providerId = user?.provider?.id ?? null;

  useEffect(() => {
    if (!enabled || subject === null || debounced.length < MIN_QUERY_LENGTH) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    let current = true;
    setLoading(true);
    const search = debounced;
    const page = { page: 1, pageSize: RESULTS_PER_GROUP };

    const patientsRead = isAdmin
      ? patientService.search({ search, ...page }).then((result) =>
          result.items.map((p) => ({
            id: p.id,
            name: patientFullName(p),
            detail: p.dateOfBirth,
          })),
        )
      : isDoctor && providerId
        ? patientService
            .listRoster({ providerId, search, ...page })
            .then((result) =>
              result.items.map((row) => ({
                id: row.patient.id,
                name: patientFullName(row.patient),
                detail: row.patient.dateOfBirth,
              })),
            )
        : Promise.resolve<PaletteEntity[]>([]);

    const doctorsRead = providerService
      .directory({ search, ...page })
      .then((result) =>
        result.items.map((d) => ({
          id: d.id,
          name: providerFullName(d),
          detail: [d.specialty, d.clinicName].filter(Boolean).join(" · "),
        })),
      );

    const clinicsRead = clinicService
      .search({ search, ...page })
      .then((result) =>
        result.items.map((c) => ({
          id: c.id,
          name: c.name,
          detail: c.location ?? undefined,
        })),
      );

    void Promise.allSettled([patientsRead, doctorsRead, clinicsRead]).then(
      ([patients, doctors, clinics]) => {
        if (!current) return;
        setResults({
          patients: patients.status === "fulfilled" ? patients.value : [],
          doctors: doctors.status === "fulfilled" ? doctors.value : [],
          clinics: clinics.status === "fulfilled" ? clinics.value : [],
        });
        setLoading(false);
      },
    );
    return () => {
      current = false;
    };
  }, [
    enabled,
    subject,
    debounced,
    isAdmin,
    isDoctor,
    providerId,
    patientService,
    providerService,
    clinicService,
  ]);

  return { results, loading, searching: debounced.length >= MIN_QUERY_LENGTH };
}
