"use client";

import { useService } from "@/di/container-provider";
import type { VerificationStatus } from "@/domain/auth";
import { type Provider, providerFullName } from "@/domain/entities";
import { announceCountsChanged } from "@/features/notification-bell/components/use-my-dashboard";
import { useAsyncData } from "@/hooks/use-async-data";
import { useOptimisticMutations } from "@/hooks/use-optimistic-mutations";

const statusOf = (p: Provider): VerificationStatus =>
  p.verificationStatus ?? "PENDING";

/**
 * Every doctor at one clinic, for that clinic's admin. Approve and reject move
 * the doctor between tabs at once and send the request in the background; a
 * failure moves them back. Reject can be undone for a few seconds.
 */
export function useClinicDoctors(clinicId: string | null) {
  const providerService = useService("providerService");
  const { data, loading, error, reload, refresh, mutate } = useAsyncData<
    Provider[]
  >(
    () =>
      clinicId ? providerService.clinicRoster(clinicId) : Promise.resolve([]),
    clinicId ?? "",
  );
  const doctors = data ?? [];

  const runOptimistic = useOptimisticMutations(() => {
    void refresh();
    announceCountsChanged();
  });

  const setStatus = (id: string, status: VerificationStatus) =>
    mutate((current) =>
      current?.map((p) =>
        p.id === id ? { ...p, verificationStatus: status } : p,
      ),
    );

  const verify = (row: Provider) => {
    const name = providerFullName(row);
    const before = statusOf(row);
    runOptimistic({
      apply: () => setStatus(row.id, "VERIFIED"),
      rollback: () => setStatus(row.id, before),
      request: () => providerService.verify(row.id),
      failureMessage: `Could not admit ${name}`,
      successMessage: `${name} admitted`,
    });
  };

  const reject = (row: Provider) => {
    const name = providerFullName(row);
    runOptimistic({
      apply: () => setStatus(row.id, "REJECTED"),
      rollback: () => setStatus(row.id, "PENDING"),
      request: () => providerService.reject(row.id),
      failureMessage: `Could not decline ${name}`,
      successMessage: `${name} declined`,
      undo: {},
    });
  };

  const byStatus = (status: VerificationStatus) =>
    doctors.filter((p) => statusOf(p) === status);

  return { doctors, byStatus, loading, error, reload, verify, reject };
}
