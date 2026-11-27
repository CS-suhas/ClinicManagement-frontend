"use client";

import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { unlessDenied } from "../api";
import { type DoctorProfile, toDoctorProfile } from "./doctor-profile";

export async function findBookableDoctor(
  providerId: string,
): Promise<DoctorProfile | null> {
  const provider = await unlessDenied(() =>
    unwrap(
      api.GET("/api/providers/{id}", { params: { path: { id: providerId } } }),
    ),
  );
  return provider?.verificationStatus === "VERIFIED"
    ? toDoctorProfile(provider, undefined)
    : null;
}

export function useBookableDoctor(providerId: string) {
  const query = useQuery({
    queryKey: ["providers", providerId, "bookable"],
    queryFn: () => findBookableDoctor(providerId),
  });
  return {
    data: query.data,
    loading: query.isPending,
    error: query.error ? getErrorMessage(query.error) : null,
    reload: () => void query.refetch(),
  };
}
