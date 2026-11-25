"use client";

import { useEffect, useState } from "react";
import { pendingRequestFor } from "@/application/services";
import { useService } from "@/di/container-provider";
import type { Clinic, ClinicJoinRequest, Provider } from "@/domain/entities";
import { ConflictError } from "@/domain/errors";
import type { ClinicSummary } from "@/domain/repositories/glance";
import { useNotify } from "@/presentation/components/notifications";
import { useAsyncData } from "@/presentation/hooks/use-async-data";
import { getErrorMessage } from "@/presentation/lib/errors";

export const CLINIC_SEARCH_DEBOUNCE_MS = 250;
const CLINIC_RESULTS = 20;

/** Shown when a second request is refused, or the doctor is already at that clinic. */
export const JOIN_CONFLICT_MESSAGE =
  "You already have a request waiting, or you already practise at this clinic. Refresh to see where things stand.";

/**
 * A doctor's clinic position: the clinic they belong to (every doctor has
 * one), their requests to move, and a searchable list of other clinics to ask
 * to move to. Only one request can be pending at a time, which the list
 * enforces by disabling the buttons.
 */
export function useMyClinic(providerId: string | null) {
  const providerService = useService("providerService");
  const clinicService = useService("clinicService");
  const clinicJoinService = useService("clinicJoinService");
  const glanceService = useService("glanceService");
  const { notifySuccess, notifyError } = useNotify();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(
      () => setSearch(searchText.trim()),
      CLINIC_SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [searchText]);

  const provider = useAsyncData<Provider | null>(
    () =>
      providerId ? providerService.get(providerId) : Promise.resolve(null),
    providerId ?? "",
  );
  // Null only until the provider has loaded.
  const clinicId = provider.data?.clinicId ?? null;

  const summary = useAsyncData<ClinicSummary | null>(
    () =>
      clinicId
        ? glanceService.getClinicSummary(clinicId)
        : Promise.resolve(null),
    clinicId ?? "",
  );

  const requests = useAsyncData<ClinicJoinRequest[]>(
    () =>
      providerId
        ? clinicJoinService.listForProvider(providerId)
        : Promise.resolve([]),
    providerId ?? "",
  );
  const history = [...(requests.data ?? [])].sort(
    (a, b) => Date.parse(b.createdAtUtc) - Date.parse(a.createdAtUtc),
  );
  const pending = pendingRequestFor(requests.data ?? []);

  // The doctor's own clinic is never a target: asking for it is a 409.
  const clinics = useAsyncData<Clinic[]>(
    () =>
      clinicId
        ? clinicService
            .search({
              search: search || undefined,
              page: 1,
              pageSize: CLINIC_RESULTS,
            })
            .then((result) =>
              result.items.filter((clinic) => clinic.id !== clinicId),
            )
        : Promise.resolve([]),
    `${clinicId ?? ""}|${search}`,
  );

  const requestMove = async (clinic: Clinic) => {
    if (!providerId) return;
    setBusyId(clinic.id);
    try {
      await clinicJoinService.createForProvider(providerId, clinic.id);
      notifySuccess(`Request to move sent to ${clinic.name}`);
      await requests.reload();
    } catch (e) {
      notifyError(
        e instanceof ConflictError
          ? JOIN_CONFLICT_MESSAGE
          : `Could not send the request: ${getErrorMessage(e)}`,
      );
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async (request: ClinicJoinRequest) => {
    setBusyId(request.id);
    try {
      await clinicJoinService.cancel(request.id);
      notifySuccess("Request cancelled");
      await requests.reload();
    } catch (e) {
      notifyError(
        e instanceof ConflictError
          ? "This request has already been decided, so it cannot be cancelled."
          : `Could not cancel the request: ${getErrorMessage(e)}`,
      );
    } finally {
      setBusyId(null);
    }
  };

  return {
    provider,
    clinicId,
    summary,
    requests,
    history,
    pending,
    searchText,
    setSearchText,
    clinics,
    requestMove,
    cancel,
    busyId,
  };
}
