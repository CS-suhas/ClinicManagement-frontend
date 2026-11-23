export const CLINIC_JOIN_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;
export type ClinicJoinStatus = (typeof CLINIC_JOIN_STATUSES)[number];

/** A doctor's request to join a clinic. Names are joined in by the API. */
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
