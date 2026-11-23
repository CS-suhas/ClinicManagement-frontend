import type { CurrentUser } from "@/domain/auth";
import type {
  Clinic,
  ClinicJoinRequest,
  ClinicJoinStatus,
  Provider,
} from "@/domain/entities";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "@/domain/errors";
import type { ClinicJoinRequestRepository } from "@/domain/repositories";
import { delay, type LocalStorageCollection } from "./local-storage-collection";
import { newId } from "./mock-repositories";

/** A join request as stored: the names are joined in when it is read. */
export interface ClinicJoinRequestRecord {
  id: string;
  providerId: string;
  clinicId: string;
  status: ClinicJoinStatus;
  createdAtUtc: string;
  decidedAtUtc: string | null;
}

interface Listable<T> {
  list(): Promise<T[]>;
}

const newestFirst = (
  a: { createdAtUtc: string },
  b: { createdAtUtc: string },
) => Date.parse(b.createdAtUtc) - Date.parse(a.createdAtUtc);

/**
 * Clinic join requests. Enforces the API's rules, reading the caller from
 * `currentUser`. Approval also writes the provider's clinic into the provider store.
 */
export class MockClinicJoinRequestRepository
  implements ClinicJoinRequestRepository
{
  constructor(
    private readonly store: LocalStorageCollection<ClinicJoinRequestRecord>,
    private readonly providers: LocalStorageCollection<Provider>,
    private readonly clinics: Listable<Clinic>,
    private readonly currentUser: () => Promise<CurrentUser | null>,
  ) {}

  private async requireUser(): Promise<CurrentUser> {
    const user = await this.currentUser();
    if (!user) throw new UnauthorizedError();
    return user;
  }

  /** The doctor's own provider id, as the signed-in user. */
  private isOwnProvider(user: CurrentUser, providerId: string): boolean {
    return user.provider?.id === providerId;
  }

  private isClinicAdminOf(user: CurrentUser, clinicId: string): boolean {
    return (
      user.roles.includes("clinicadmin") &&
      user.clinicAdminOf.includes(clinicId)
    );
  }

  /** Joins provider and clinic names onto the records, newest first. */
  private async toRequests(
    records: ClinicJoinRequestRecord[],
  ): Promise<ClinicJoinRequest[]> {
    const clinics = await this.clinics.list();
    const providers = this.providers.read();
    const clinicNames = new Map(
      clinics.map((clinic) => [clinic.id, clinic.name]),
    );
    const providerById = new Map(
      providers.map((provider) => [provider.id, provider]),
    );
    return [...records].sort(newestFirst).map((record) => {
      const provider = providerById.get(record.providerId);
      return {
        id: record.id,
        providerId: record.providerId,
        providerName: provider
          ? `${provider.firstName} ${provider.lastName}`.trim()
          : "",
        providerSpecialty: provider?.specialty ?? "",
        clinicId: record.clinicId,
        clinicName: clinicNames.get(record.clinicId) ?? "",
        status: record.status,
        createdAtUtc: record.createdAtUtc,
        decidedAtUtc: record.decidedAtUtc,
      };
    });
  }

  /** Doctor only, for their own verified provider with no clinic. One PENDING request at a time. */
  async createForProvider(
    providerId: string,
    clinicId: string,
  ): Promise<{ id: string }> {
    await delay();
    const user = await this.requireUser();
    const provider = this.providers
      .read()
      .find((item) => item.id === providerId);
    const isOwnDoctor =
      user.roles.includes("doctor") && this.isOwnProvider(user, providerId);
    if (!isOwnDoctor || !provider || provider.verificationStatus !== "VERIFIED")
      throw new ForbiddenError(
        "Only a verified doctor can request to join a clinic.",
      );
    const clinic = (await this.clinics.list()).find(
      (item) => item.id === clinicId,
    );
    if (!clinic) throw new NotFoundError("Clinic", clinicId);
    if (provider.clinicId)
      throw new ConflictError("You already belong to a clinic.");
    const records = this.store.read();
    if (
      records.some(
        (record) =>
          record.providerId === providerId && record.status === "PENDING",
      )
    )
      throw new ConflictError("You already have a pending request.");
    const record: ClinicJoinRequestRecord = {
      id: newId(),
      providerId,
      clinicId,
      status: "PENDING",
      createdAtUtc: new Date().toISOString(),
      decidedAtUtc: null,
    };
    this.store.write([...records, record]);
    return { id: record.id };
  }

  /** The doctor themself, or an admin. */
  async listForProvider(providerId: string): Promise<ClinicJoinRequest[]> {
    await delay();
    const user = await this.requireUser();
    if (!user.roles.includes("admin") && !this.isOwnProvider(user, providerId))
      throw new ForbiddenError();
    return this.toRequests(
      this.store.read().filter((record) => record.providerId === providerId),
    );
  }

  /** Clinic admins of that clinic, and admins. */
  async listForClinic(
    clinicId: string,
    status?: ClinicJoinStatus,
  ): Promise<ClinicJoinRequest[]> {
    await delay();
    const user = await this.requireUser();
    if (!user.roles.includes("admin") && !this.isClinicAdminOf(user, clinicId))
      throw new ForbiddenError();
    return this.toRequests(
      this.store
        .read()
        .filter(
          (record) =>
            record.clinicId === clinicId &&
            (!status || record.status === status),
        ),
    );
  }

  /** All PENDING requests across clinics. The caller decides whether it may see the number. */
  async countPending(): Promise<number> {
    await delay();
    return this.store.read().filter((record) => record.status === "PENDING")
      .length;
  }

  approve(id: string): Promise<void> {
    return this.decide(id, "APPROVED");
  }

  reject(id: string): Promise<void> {
    return this.decide(id, "REJECTED");
  }

  /** Only the requesting doctor, and only while PENDING. */
  async cancel(id: string): Promise<void> {
    await delay();
    const user = await this.requireUser();
    const records = this.store.read();
    const index = records.findIndex((record) => record.id === id);
    if (index < 0) throw new NotFoundError("Clinic join request", id);
    const record = records[index];
    if (
      !user.roles.includes("doctor") ||
      !this.isOwnProvider(user, record.providerId)
    )
      throw new ForbiddenError();
    if (record.status !== "PENDING")
      throw new ConflictError("Only a pending request can be cancelled.");
    records[index] = {
      ...record,
      status: "CANCELLED",
      decidedAtUtc: new Date().toISOString(),
    };
    this.store.write(records);
  }

  /**
   * Approve or reject. Clinic admins of the request's clinic, and admins. Approval
   * also needs the doctor to still be verified and clinic-less, and then sets the clinic.
   */
  private async decide(
    id: string,
    decision: "APPROVED" | "REJECTED",
  ): Promise<void> {
    await delay();
    const user = await this.requireUser();
    const records = this.store.read();
    const index = records.findIndex((record) => record.id === id);
    if (index < 0) throw new NotFoundError("Clinic join request", id);
    const record = records[index];
    if (
      !user.roles.includes("admin") &&
      !this.isClinicAdminOf(user, record.clinicId)
    )
      throw new ForbiddenError();
    if (record.status !== "PENDING")
      throw new ConflictError("Only a pending request can be decided.");

    const providers = this.providers.read();
    const providerIndex = providers.findIndex(
      (provider) => provider.id === record.providerId,
    );
    if (decision === "APPROVED") {
      const provider = providers[providerIndex];
      if (!provider || provider.verificationStatus !== "VERIFIED")
        throw new ConflictError("This doctor is no longer verified.");
      if (provider.clinicId)
        throw new ConflictError("This doctor has already joined a clinic.");
      providers[providerIndex] = { ...provider, clinicId: record.clinicId };
      this.providers.write(providers);
    }
    records[index] = {
      ...record,
      status: decision,
      decidedAtUtc: new Date().toISOString(),
    };
    this.store.write(records);
  }
}
