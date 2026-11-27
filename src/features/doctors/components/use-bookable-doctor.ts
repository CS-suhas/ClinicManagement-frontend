"use client";

import { useQuery } from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/errors";
import { fetchDirectory } from "../api";
import { type DoctorProfile, toDoctorProfile } from "./doctor-profile";

const PAGE_SIZE = 100;
const MAX_PAGES = 10;

export async function findBookableDoctor(
  providerId: string,
): Promise<DoctorProfile | null> {
  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await fetchDirectory({ page, pageSize: PAGE_SIZE });
    const found = result.items.find((item) => item.id === providerId);
    if (found) return toDoctorProfile(found, undefined);
    if (result.items.length === 0 || page * PAGE_SIZE >= result.totalCount)
      break;
  }
  return null;
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
