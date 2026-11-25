"use client";

import type { ProviderService } from "@/application/services";
import { useService } from "@/di/container-provider";
import { useAsyncData } from "@/presentation/hooks/use-async-data";
import { type DoctorProfile, toDoctorProfile } from "./doctor-profile";

const PAGE_SIZE = 100;
const MAX_PAGES = 10;

/**
 * Finds one bookable (verified) doctor through the public
 * directory, which has no by-id read. Resolves to null when not listed.
 */
export async function findBookableDoctor(
  providers: ProviderService,
  providerId: string,
): Promise<DoctorProfile | null> {
  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await providers.directory({ page, pageSize: PAGE_SIZE });
    const found = result.items.find((item) => item.id === providerId);
    if (found) return toDoctorProfile(found, undefined);
    if (result.items.length === 0 || page * PAGE_SIZE >= result.totalCount)
      break;
  }
  return null;
}

/** The bookable doctor with this id, or null when she is not in the directory. */
export function useBookableDoctor(providerId: string) {
  const providerService = useService("providerService");
  return useAsyncData<DoctorProfile | null>(
    () => findBookableDoctor(providerService, providerId),
    providerId,
  );
}
