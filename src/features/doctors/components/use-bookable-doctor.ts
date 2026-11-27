"use client";

import { useQuery } from "@tanstack/react-query";
import { api, byId, orNull, unwrap } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { resourceKey } from "@/lib/query-client";
import { type DoctorProfile, toDoctorProfile } from "./doctor-profile";

export async function findBookableDoctor(
  providerId: string,
): Promise<DoctorProfile | null> {
  const provider = await orNull(() =>
    unwrap(api.GET("/api/providers/{id}", byId(providerId))),
  );
  return provider?.verificationStatus === "VERIFIED"
    ? toDoctorProfile(provider, undefined)
    : null;
}

export function useBookableDoctor(providerId: string) {
  const query = useQuery({
    queryKey: resourceKey("providers", providerId, "bookable"),
    queryFn: () => findBookableDoctor(providerId),
  });
  return {
    data: query.data,
    loading: query.isPending,
    error: query.error ? getErrorMessage(query.error) : null,
    reload: () => void query.refetch(),
  };
}
