export const CLINIC_JOIN_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;
export type ClinicJoinStatus = (typeof CLINIC_JOIN_STATUSES)[number];

/**
 * A verified doctor's request to move to another clinic (they always belong to
 * one). Approval moves them. Names are joined in by the API.
 */
export interface ClinicJoinRequest {
  id: string;
  providerId: string;
  providerName: string;
  providerSpecialty: string;
  clinicId: string;
  clinicName: string;
  status: ClinicJoinStatus;
  /** ISO date-time, UTC. */
  createdAtUtc: string;
  /** ISO date-time, UTC; null until the request is decided or cancelled. */
  decidedAtUtc: string | null;
}
