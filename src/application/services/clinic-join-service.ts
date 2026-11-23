import type { ClinicJoinRequest, ClinicJoinStatus } from "@/domain/entities";
import { assertValid, type FieldErrors } from "@/domain/errors";
import type { ClinicJoinRequestRepository } from "@/domain/repositories";
import { isBlank } from "@/domain/validation";

/** The doctor's current request, if any: the newest PENDING one. Pure. */
export function pendingRequestFor(
  requests: readonly ClinicJoinRequest[],
): ClinicJoinRequest | null {
  const pending = requests.filter((request) => request.status === "PENDING");
  pending.sort(
    (a, b) => Date.parse(b.createdAtUtc) - Date.parse(a.createdAtUtc),
  );
  return pending[0] ?? null;
}

export class ClinicJoinService {
  constructor(private readonly requests: ClinicJoinRequestRepository) {}

  /** Doctor only, for their own provider id. Only one PENDING request at a time. */
  createForProvider(providerId: string, clinicId: string) {
    const errors: FieldErrors = {};
    if (isBlank(providerId)) errors.providerId = "Provider is required";
    if (isBlank(clinicId)) errors.clinicId = "Choose a clinic";
    assertValid(errors);
    return this.requests.createForProvider(providerId, clinicId);
  }

  listForProvider(providerId: string): Promise<ClinicJoinRequest[]> {
    return this.requests.listForProvider(providerId);
  }

  listForClinic(
    clinicId: string,
    status?: ClinicJoinStatus,
  ): Promise<ClinicJoinRequest[]> {
    return this.requests.listForClinic(clinicId, status);
  }

  approve(id: string): Promise<void> {
    return this.requests.approve(id);
  }

  reject(id: string): Promise<void> {
    return this.requests.reject(id);
  }

  cancel(id: string): Promise<void> {
    return this.requests.cancel(id);
  }
}
