"use client";

import { useService } from "@/di/container-provider";
import type { Provider } from "@/domain/entities";
import type { ClinicSummary } from "@/domain/repositories/glance";
import { useAsyncData } from "@/hooks/use-async-data";

export function useMyClinic(providerId: string | null) {
  const providerService = useService("providerService");
  const glanceService = useService("glanceService");

  const provider = useAsyncData<Provider | null>(
    () =>
      providerId ? providerService.get(providerId) : Promise.resolve(null),
    providerId ?? "",
  );
  const clinicId = provider.data?.clinicId ?? null;

  const summary = useAsyncData<ClinicSummary | null>(
    () =>
      clinicId
        ? glanceService.getClinicSummary(clinicId)
        : Promise.resolve(null),
    clinicId ?? "",
  );

  return { provider, clinicId, summary };
}
