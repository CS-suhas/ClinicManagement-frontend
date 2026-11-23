import type { VerificationStatus } from "@/domain/auth";
import type {
  AllergyType,
  Appointment,
  AppointmentAction,
  AppointmentInput,
  Clinic,
  ClinicInput,
  ClinicJoinRequest,
  ClinicJoinStatus,
  PatientAllergy,
  Provider,
  ProviderGender,
  ProviderInput,
} from "@/domain/entities";
import { UnauthorizedError } from "@/domain/errors";
import type {
  AppointmentAvailabilityRepository,
  AppointmentListItem,
  AppointmentRepository,
  AppointmentSearchOptions,
  ClinicJoinRequestRepository,
  ConfigurationRepository,
  CrudRepository,
  DashboardData,
  DashboardRepository,
  MeDashboard,
  PagedResult,
  PatientAllergyRepository,
  PatientRosterRow,
  ProviderDirectoryEntry,
  ProviderDirectoryOptions,
  ProviderDirectoryRepository,
  ProviderRosterRepository,
  ProviderSearchOptions,
  ProviderVerificationRepository,
  SearchOptions,
  VerificationSearchOptions,
} from "@/domain/repositories";
import type { HttpClient } from "./http-client";
import { queryString } from "./query-string";

/** Translates between the API's JSON and the domain's shapes. */
interface RestMapper<T, TInput, TResponse> {
  fromResponse(response: TResponse): T;
  toRequest(input: TInput): object;
}

const identityMapper = {
  fromResponse: (response: unknown) => response,
  toRequest: (input: unknown) => input as object,
};

/**
 * REST adapter. Expected API shape (camelCase JSON):
 *   GET    {resource}        -> T[]
 *   GET    {resource}/search -> PagedResult<T>
 *   GET    {resource}/:id    -> T
 *   POST   {resource}        -> T
 *   PUT    {resource}/:id    -> T
 *   DELETE {resource}/:id
 * Pass a `mapper` when the API's JSON differs from the domain entity.
 */
export class RestCrudRepository<T extends { id: string }, TInput, TResponse = T>
  implements CrudRepository<T, TInput>
{
  constructor(
    private readonly http: HttpClient,
    private readonly resource: string,
    private readonly mapper: RestMapper<
      T,
      TInput,
      TResponse
    > = identityMapper as unknown as RestMapper<T, TInput, TResponse>,
  ) {}

  private url(id: string) {
    return `${this.resource}/${encodeURIComponent(id)}`;
  }

  async list() {
    const items = await this.http.get<TResponse[]>(this.resource);
    return items.map((item) => this.mapper.fromResponse(item));
  }

  async search(options: SearchOptions | ProviderSearchOptions) {
    const query = queryString({
      Search: options.search,
      Page: options.page,
      PageSize: options.pageSize,
      clinicId: "clinicId" in options ? options.clinicId : undefined,
    });
    const result = await this.http.get<PagedResult<TResponse>>(
      `${this.resource}/search?${query}`,
    );
    return {
      ...result,
      items: result.items.map((item) => this.mapper.fromResponse(item)),
    };
  }

  async getById(id: string) {
    const item = await this.http.getOrNull<TResponse>(this.url(id));
    return item && this.mapper.fromResponse(item);
  }

  async create(input: TInput, id: string = crypto.randomUUID()) {
    const item = await this.http.post<TResponse>(this.resource, {
      ...this.mapper.toRequest(input),
      id,
    });
    return this.mapper.fromResponse(item);
  }

  async update(id: string, input: TInput) {
    const item = await this.http.put<TResponse>(this.url(id), {
      ...this.mapper.toRequest(input),
      id,
    });
    return this.mapper.fromResponse(item);
  }

  delete(id: string) {
    return this.http.delete(this.url(id));
  }
}

interface ClinicResponse {
  id: string;
  name: string;
  address: string | null;
  phoneNumber: string | null;
}

const clinicMapper: RestMapper<Clinic, ClinicInput, ClinicResponse> = {
  fromResponse: (clinic) => ({
    id: clinic.id,
    name: clinic.name,
    location: clinic.address,
    phoneNumber: clinic.phoneNumber ?? "",
  }),
  toRequest: (input) => ({
    name: input.name,
    address: input.location,
    phoneNumber: input.phoneNumber,
  }),
};

interface ProviderResponse {
  id: string;
  clinicId: string | null;
  firstName: string;
  lastName: string;
  specialty: string;
  verificationStatus: VerificationStatus;
  fee: number | null;
  /** Always uppercase in responses. */
  gender: ProviderGender | null;
}

const providerMapper: RestMapper<Provider, ProviderInput, ProviderResponse> = {
  fromResponse: (provider) => ({
    id: provider.id,
    // A self-registered doctor may have no clinic yet; the form treats "" as unset.
    clinicId: provider.clinicId ?? "",
    firstName: provider.firstName,
    lastName: provider.lastName,
    specialty: provider.specialty,
    verificationStatus: provider.verificationStatus,
    fee: provider.fee,
    gender: provider.gender,
  }),
  // PUT replaces the whole record, so null is sent explicitly to clear a value.
  toRequest: (input) => ({
    clinicId: input.clinicId,
    firstName: input.firstName,
    lastName: input.lastName,
    specialty: input.specialty,
    fee: input.fee ?? null,
    gender: input.gender ?? null,
  }),
};

/** Providers are created and updated with fee and gender, and never send verificationStatus. */
export class RestProviderRepository extends RestCrudRepository<
  Provider,
  ProviderInput,
  ProviderResponse
> {
  constructor(http: HttpClient) {
    super(http, "/providers", providerMapper);
  }
}

/** Clinics are stored with `address`, which the domain calls `location`. */
export class RestClinicRepository extends RestCrudRepository<
  Clinic,
  ClinicInput,
  ClinicResponse
> {
  constructor(http: HttpClient) {
    super(http, "/clinics", clinicMapper);
  }
}

export class RestConfigurationRepository implements ConfigurationRepository {
  constructor(private readonly http: HttpClient) {}

  getAllergySeverities() {
    return this.http.get<unknown>("/api/config/allergy-severities");
  }

  getAppointmentSettings() {
    return this.http.get<unknown>("/api/config/appointment-settings");
  }
}

export class RestDashboardRepository implements DashboardRepository {
  constructor(private readonly http: HttpClient) {}

  getDashboard() {
    return this.http.get<DashboardData>("/dashboard");
  }

  getMine() {
    return this.http.get<MeDashboard>("/me/dashboard");
  }
}

/**
 *   GET    /patients/:patientId/allergies
 *   GET    /patients/:patientId/allergies/search
 *   GET    /patients/:patientId/allergy-options
 *   GET    /allergy-types/:allergyId/patients
 *   POST   /patients/:patientId/allergies
 *   PUT    /patients/:patientId/allergies/:allergyId
 *   DELETE /patients/:patientId/allergies/:allergyId
 */
export class RestPatientAllergyRepository implements PatientAllergyRepository {
  constructor(private readonly http: HttpClient) {}

  async listByPatient(patientId: string) {
    const records = await this.http.get<
      Array<{
        allergyId: string;
        name: string;
        severity: string;
        notes: string | null;
      }>
    >(`/patients/${encodeURIComponent(patientId)}/allergies`);
    return records.map((record) => ({
      patientId,
      allergyId: record.allergyId,
      allergyName: record.name,
      severity: record.severity,
      notes: record.notes ?? "",
    }));
  }

  async searchByPatient(patientId: string, options: SearchOptions) {
    const query = queryString({
      Search: options.search,
      Page: options.page,
      PageSize: options.pageSize,
    });
    const result = await this.http.get<
      PagedResult<{
        id: string;
        allergyId: string;
        name: string;
        severity: string;
        notes: string | null;
      }>
    >(`/patients/${encodeURIComponent(patientId)}/allergies/search?${query}`);
    return {
      ...result,
      items: result.items.map((item) => ({
        patientId,
        allergyId: item.allergyId,
        allergyName: item.name,
        severity: item.severity,
        notes: item.notes ?? "",
      })),
    };
  }

  allergyOptions(
    patientId: string,
    options: SearchOptions & { selectedAllergyId?: string },
  ) {
    const query = queryString({
      Search: options.search,
      selectedAllergyId: options.selectedAllergyId,
      Page: options.page,
      PageSize: options.pageSize,
    });
    return this.http.get<PagedResult<AllergyType>>(
      `/patients/${encodeURIComponent(patientId)}/allergy-options?${query}`,
    );
  }

  listByAllergy(allergyId: string) {
    return this.http.get<PatientAllergy[]>(
      `/allergy-types/${encodeURIComponent(allergyId)}/patients`,
    );
  }

  async add(record: PatientAllergy) {
    await this.http.post<unknown>(
      `/patients/${encodeURIComponent(record.patientId)}/allergies`,
      {
        allergyId: record.allergyId,
        severity: record.severity,
        notes: record.notes,
      },
    );
    return record;
  }

  async save(record: PatientAllergy) {
    await this.http.put<unknown>(
      `/patients/${encodeURIComponent(record.patientId)}/allergies/${encodeURIComponent(record.allergyId)}`,
      {
        allergyId: record.allergyId,
        severity: record.severity,
        notes: record.notes,
      },
    );
    return record;
  }

  delete(patientId: string, allergyId: string) {
    return this.http.delete(
      `/patients/${encodeURIComponent(patientId)}/allergies/${encodeURIComponent(allergyId)}`,
    );
  }
}

export class RestAppointmentRepository implements AppointmentRepository {
  private readonly http: HttpClient;
  private readonly crud: RestCrudRepository<Appointment, AppointmentInput>;

  constructor(http: HttpClient) {
    this.http = http;
    this.crud = new RestCrudRepository(http, "/appointments");
  }

  list() {
    return this.crud.list();
  }

  getById(id: string) {
    return this.crud.getById(id);
  }

  create(input: AppointmentInput, id?: string) {
    return this.crud.create(input, id);
  }

  update(id: string, input: AppointmentInput) {
    return this.crud.update(id, input);
  }

  delete(id: string) {
    return this.crud.delete(id);
  }

  search(options: AppointmentSearchOptions) {
    const query = queryString({
      search: options.search,
      from: options.from,
      to: options.to,
      clinicId: options.clinicId,
      providerId: options.providerId,
      providerIds: options.providerIds,
      patientId: options.patientId,
      status: options.status,
      page: options.page,
      pageSize: options.pageSize,
    });
    return this.http.get<PagedResult<AppointmentListItem>>(
      `/appointments/search?${query}`,
    );
  }

  confirm(id: string) {
    return this.transition(id, "confirm");
  }

  decline(id: string) {
    return this.transition(id, "decline");
  }

  complete(id: string) {
    return this.transition(id, "complete");
  }

  cancel(id: string) {
    return this.transition(id, "cancel");
  }

  /** POST /appointments/:id/{action}, answered with 204. */
  private transition(id: string, action: AppointmentAction) {
    return this.http.post<void>(
      `/appointments/${encodeURIComponent(id)}/${action}`,
      undefined,
    );
  }
}

/** GET /providers/:id/patients. The API limits access to the doctor, an admin, or a clinic admin of that doctor's clinic. */
export class RestProviderRosterRepository implements ProviderRosterRepository {
  constructor(private readonly http: HttpClient) {}

  searchProviderRoster(providerId: string, options: SearchOptions) {
    const query = queryString({
      search: options.search,
      page: options.page,
      pageSize: options.pageSize,
    });
    return this.http.get<PagedResult<PatientRosterRow>>(
      `/providers/${encodeURIComponent(providerId)}/patients?${query}`,
    );
  }
}

/** The directory row as the API sends it. `clinicName` is optional until the API always sends it. */
interface DirectoryResponse extends ProviderResponse {
  clinicName?: string | null;
}

/**
 * GET /providers/directory: the public, bookable doctors. Uses the API's
 * clinicName when present; otherwise looks names up in GET /clinics, once per call.
 */
export class RestProviderDirectoryRepository
  implements ProviderDirectoryRepository
{
  constructor(
    private readonly http: HttpClient,
    private readonly clinics: { list(): Promise<Clinic[]> },
  ) {}

  async list(
    options: ProviderDirectoryOptions,
  ): Promise<PagedResult<ProviderDirectoryEntry>> {
    const query = queryString({
      search: options.search,
      clinicId: options.clinicId,
      page: options.page,
      pageSize: options.pageSize,
    });
    const result = await this.http.get<PagedResult<DirectoryResponse>>(
      `/providers/directory?${query}`,
    );
    const needsLookup = result.items.some(
      (item) => typeof item.clinicName !== "string",
    );
    const clinicNames = needsLookup
      ? await this.loadClinicNames()
      : new Map<string, string>();
    return {
      ...result,
      items: result.items.map((item) => ({
        ...providerMapper.fromResponse(item),
        clinicName:
          typeof item.clinicName === "string"
            ? item.clinicName
            : (clinicNames.get(item.clinicId ?? "") ?? null),
      })),
    };
  }

  /** Anonymous visitors cannot read /clinics, so their names stay null. */
  private async loadClinicNames(): Promise<Map<string, string>> {
    try {
      const clinics = await this.clinics.list();
      return new Map(clinics.map((clinic) => [clinic.id, clinic.name]));
    } catch (e) {
      if (e instanceof UnauthorizedError) return new Map();
      throw e;
    }
  }
}

/** Doctor verification. Search is forced to VERIFIED for non-admins by the API. */
export class RestProviderVerificationRepository
  implements ProviderVerificationRepository
{
  constructor(private readonly http: HttpClient) {}

  async searchByStatus(options: VerificationSearchOptions) {
    const query = queryString({
      verificationStatus: options.verificationStatus,
      search: options.search,
      page: options.page,
      pageSize: options.pageSize,
    });
    const result = await this.http.get<PagedResult<ProviderResponse>>(
      `/providers/search?${query}`,
    );
    return {
      ...result,
      items: result.items.map((item) => providerMapper.fromResponse(item)),
    };
  }

  verify(id: string) {
    return this.http.post<void>(
      `/providers/${encodeURIComponent(id)}/verify`,
      undefined,
    );
  }

  reject(id: string) {
    return this.http.post<void>(
      `/providers/${encodeURIComponent(id)}/reject`,
      undefined,
    );
  }
}

/** Busy slots for one doctor on one day. */
export class RestAppointmentAvailabilityRepository
  implements AppointmentAvailabilityRepository
{
  constructor(private readonly http: HttpClient) {}

  async getBusyStarts(providerId: string, date: string): Promise<string[]> {
    // `date` is a UTC day on the API; a Sri Lanka clinic day (08:00-16:00
    // +05:30) falls inside the same UTC date, so the local day is passed as is.
    // Times come back in UTC; callers compare instants, so no conversion here.
    const raw = await this.http.get<{ busyStartTimes?: unknown }>(
      `/providers/${encodeURIComponent(providerId)}/busy-slots?${queryString({ date })}`,
    );
    const list = raw?.busyStartTimes;
    if (!Array.isArray(list) || !list.every((s) => typeof s === "string"))
      throw new Error("The API returned invalid busy slots.");
    return list;
  }
}

/** Clinic join requests. Each path follows the API contract in the backend notes. */
export class RestClinicJoinRequestRepository
  implements ClinicJoinRequestRepository
{
  constructor(private readonly http: HttpClient) {}

  createForProvider(providerId: string, clinicId: string) {
    return this.http.post<{ id: string }>(
      `/providers/${encodeURIComponent(providerId)}/clinic-join-requests`,
      { clinicId },
    );
  }

  listForProvider(providerId: string) {
    return this.http.get<ClinicJoinRequest[]>(
      `/providers/${encodeURIComponent(providerId)}/clinic-join-requests`,
    );
  }

  listForClinic(clinicId: string, status?: ClinicJoinStatus) {
    const query = queryString({ status });
    return this.http.get<ClinicJoinRequest[]>(
      `/clinics/${encodeURIComponent(clinicId)}/join-requests?${query}`,
    );
  }

  approve(id: string) {
    return this.decide(id, "approve");
  }

  reject(id: string) {
    return this.decide(id, "reject");
  }

  cancel(id: string) {
    return this.http.post<void>(
      `/clinic-join-requests/${encodeURIComponent(id)}/cancel`,
      undefined,
    );
  }

  private decide(id: string, action: "approve" | "reject") {
    return this.http.post<void>(
      `/clinic-join-requests/${encodeURIComponent(id)}/${action}`,
      undefined,
    );
  }
}
