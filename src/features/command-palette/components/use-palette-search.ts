"use client";

import { useEffect, useMemo, useState } from "react";
import type { CurrentUser } from "@/features/auth/schemas";
import { useGlobalSearch } from "@/features/command-palette/api";
import type { Schemas } from "@/lib/api";

export const PALETTE_DEBOUNCE_MS = 200;
const MIN_QUERY_LENGTH = 2;

export type PaletteEntity = {
  id: string;
  name: string;
  detail?: string;
};

export type PaletteRemoteResults = {
  patients: PaletteEntity[];
  doctors: PaletteEntity[];
  clinics: PaletteEntity[];
};

const EMPTY: PaletteRemoteResults = { patients: [], doctors: [], clinics: [] };

function toPaletteResults(
  found: Schemas["SearchResponse"],
): PaletteRemoteResults {
  return {
    patients: found.patients.map((p) => ({
      id: p.id,
      name: p.name,
      detail: p.subtitle || undefined,
    })),
    doctors: found.providers.map((d) => ({
      id: d.id,
      name: d.name,
      detail:
        [d.specialty, d.clinicName].filter(Boolean).join(" · ") || undefined,
    })),
    clinics: found.clinics.map((c) => ({
      id: c.id,
      name: c.name,
      detail: c.address || undefined,
    })),
  };
}

export function usePaletteSearch(
  query: string,
  user: CurrentUser | null,
  enabled: boolean,
) {
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(
      () => setDebounced(query.trim()),
      PALETTE_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [query]);

  const active =
    enabled && user !== null && debounced.length >= MIN_QUERY_LENGTH;
  const found = useGlobalSearch(debounced, active);
  const results = useMemo(
    () => (active && found.data ? toPaletteResults(found.data) : EMPTY),
    [active, found.data],
  );

  return {
    results,
    loading: active && found.isFetching,
    searching: debounced.length >= MIN_QUERY_LENGTH,
  };
}
