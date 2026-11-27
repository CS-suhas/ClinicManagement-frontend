"use client";

import { useEffect, useState } from "react";
import { useService } from "@/di/container-provider";
import type { CurrentUser } from "@/domain/auth";

export const PALETTE_DEBOUNCE_MS = 200;
const MIN_QUERY_LENGTH = 2;
const RESULTS_PER_GROUP = 5;

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

/**
 * Debounced people and place search for the palette, in one request. The
 * search endpoint applies role scoping itself (patients only for admins,
 * doctors and clinic admins; verified doctors only for non-admins). Stale
 * responses are dropped when the query changes.
 */
export function usePaletteSearch(
  query: string,
  user: CurrentUser | null,
  enabled: boolean,
) {
  const searchService = useService("searchService");
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

  useEffect(() => {
    if (!enabled || subject === null || debounced.length < MIN_QUERY_LENGTH) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    let current = true;
    setLoading(true);
    searchService
      .search(debounced, RESULTS_PER_GROUP)
      .then((found) => {
        if (!current) return;
        setResults({
          patients: found.patients.map((p) => ({
            id: p.id,
            name: p.name,
            detail: p.subtitle || undefined,
          })),
          doctors: found.providers.map((d) => ({
            id: d.id,
            name: d.name,
            detail:
              [d.specialty, d.clinicName].filter(Boolean).join(" · ") ||
              undefined,
          })),
          clinics: found.clinics.map((c) => ({
            id: c.id,
            name: c.name,
            detail: c.address || undefined,
          })),
        });
      })
      .catch(() => {
        if (current) setResults(EMPTY);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [enabled, subject, debounced, searchService]);

  return { results, loading, searching: debounced.length >= MIN_QUERY_LENGTH };
}
