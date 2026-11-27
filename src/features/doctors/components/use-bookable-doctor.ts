"use client";

import type { ProviderService } from "@/application/services";
import { useService } from "@/di/container-provider";
import { useAsyncData } from "@/hooks/use-async-data";
import { type DoctorProfile, toDoctorProfile } from "./doctor-profile";

const PAGE_SIZE = 100;
const MAX_PAGES = 10;

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

export function useBookableDoctor(providerId: string) {
  const providerService = useService("providerService");
  return useAsyncData<DoctorProfile | null>(
    () => findBookableDoctor(providerService, providerId),
    providerId,
  );
}
