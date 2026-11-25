import type {
  Appointment,
  AppointmentAction,
  AppointmentInput,
  Clinic,
  ClinicInput,
  PatientAllergy,
  Provider,
  ProviderInput,
} from "@/domain/entities";
import { NotFoundError, UnauthorizedError } from "@/domain/errors";
import type {
  AppointmentAvailabilityRepository,
  AppointmentRepository,
  AppointmentSearchOptions,
  ConfigurationRepository,
  CrudRepository,
  DashboardRepository,
  PagedResult,
  PatientAllergyRepository,
  ProviderDirectoryEntry,
  ProviderDirectoryOptions,
  ProviderDirectoryRepository,
  ProviderRosterRepository,
  ProviderSearchOptions,
  ProviderVerificationRepository,
  SearchOptions,
  VerificationSearchOptions,
} from "@/domain/repositories";
import type { Api, ApiGet, ApiPost, Endpoint } from "./api-types";
import type { HttpClient } from "./http-client";
import { queryString } from "./query-string";

/** Translates between the API's JSON and the domain's shapes. */
export interface RestMapper<T, TInput, TResponse> {
  fromResponse(response: TResponse): T;
  toRequest(input: TInput): object;
}

/**
 * For resources whose API response already has the domain shape. The
 * `TResponse extends T` constraint makes the type check prove that it does.
 */
export const passThrough = <T, TInput, TResponse extends T>(): RestMapper<
  T,
  TInput,
  TResponse
> => ({
  fromResponse: (response) => response,
  toRequest: (input) => input as object,
});

/** A resource whose list, search, get, create, update and delete follow RestCrudRepository's shape. */
type CrudResource = {
  [E in Endpoint]: `${E}/search` extends Endpoint
    ? `${E}/{id}` extends Endpoint
      ? E
      : never
    : never;
}[Endpoint];

/**
 * Resolves to the mapper type when every CRUD response of `R` is a
 * `TResponse` (and create returns an id); otherwise to an error message, so
 * constructing the repository fails the type check.
 */
type CheckedMapper<R extends CrudResource, T, TInput, TResponse> = [
  ApiGet<R>,
] extends [TResponse[]]
  ? [ApiGet<`${R}/search`>] extends [{ items: TResponse[] }]
    ? [ApiGet<`${R}/{id}`>] extends [TResponse]
      ? [ApiPost<R>] extends [{ id: string }]
        ? RestMapper<T, TInput, TResponse>
        : `POST ${R} does not return { id }`
      : `GET ${R}/{id} does not match the mapper's response type`
    : `GET ${R}/search does not match the mapper's response type`
  : `GET ${R} does not match the mapper's response type`;

/**
 * REST adapter. API shape (camelCase JSON):
 *   GET    {resource}        -> TResponse[]
 *   GET    {resource}/search -> PagedResult<TResponse>
 *   GET    {resource}/:id    -> TResponse
 *   POST   {resource}        -> 201 { id }   (the server generates the id)
 *   PUT    {resource}/:id    -> 204
 *   DELETE {resource}/:id    -> 204
 * The mapper turns the generated API type into the domain entity. Create and
 * update read the record back, so callers get what the server stored.
 */
export class RestCrudRepository<
  R extends CrudResource,
  T extends { id: string },
  TInput,
  TResponse,
> implements CrudRepository<T, TInput>
{
  private readonly mapper: RestMapper<T, TInput, TResponse>;

  constructor(
    private readonly http: HttpClient,
    private readonly resource: R,
    mapper: CheckedMapper<R, T, TInput, TResponse>,
  ) {
    this.mapper = mapper as RestMapper<T, TInput, TResponse>;
  }

  private url(id: string) {
    return `${this.resource}/${encodeURIComponent(id)}`;
  }

  /** GET after a write. Everyone who may write these records may also read them. */
  private async reload(id: string): Promise<T> {
    const item = await this.getById(id);
    if (!item) throw new NotFoundError(this.resource, id);
    return item;
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

  /** `id` is sent for request validation; the server ignores it and returns its own. */
  async create(input: TInput, id: string = crypto.randomUUID()) {
    const created = await this.http.post<{ id: string }>(this.resource, {
      ...this.mapper.toRequest(input),
      id,
    });
    return this.reload(created.id);
  }

  async update(id: string, input: TInput) {
    await this.http.put<void>(this.url(id), {
      ...this.mapper.toRequest(input),
      id,
    });
    return this.reload(id);
  }

  delete(id: string) {
    return this.http.delete(this.url(id));
  }
}

/** A clinic; list and search responses also carry its verified doctor count. */
export type ClinicResponse =
  | Api<"ClinicResponse">
  | Api<"ClinicListItemResponse">;

export const clinicMapper: RestMapper<Clinic, ClinicInput, ClinicResponse> = {
  fromResponse: (clinic) => ({
    id: clinic.id,
    name: clinic.name,
    location: clinic.address,
    phoneNumber: clinic.phoneNumber ?? "",
    ...("providerCount" in clinic
      ? { providerCount: clinic.providerCount }
      : {}),
  }),
  toRequest: (input) => ({
    name: input.name,
    address: input.location,
    phoneNumber: input.phoneNumber,
  }),
};

export type ProviderResponse = Api<"ProviderResponse">;

export const providerMapper: RestMapper<
  Provider,
  ProviderInput,
  ProviderResponse
> = {
  fromResponse: (provider) => ({
    id: provider.id,
    clinicId: provider.clinicId,
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
  "/providers",
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
  "/clinics",
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
    return this.http.get<ApiGet<"/allergy-severities">>("/allergy-severities");
  }

  getAppointmentSettings() {
    return this.http.get<ApiGet<"/appointment-settings">>(
      "/appointment-settings",
    );
  }
}

export class RestDashboardRepository implements DashboardRepository {
  constructor(private readonly http: HttpClient) {}

  getDashboard() {
    return this.http.get<ApiGet<"/dashboard">>("/dashboard");
  }

  getMine() {
    return this.http.get<ApiGet<"/me/dashboard">>("/me/dashboard");
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
    const records = await this.http.get<ApiGet<"/patients/{id}/allergies">>(
      `/patients/${encodeURIComponent(patientId)}/allergies`,
    );
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
      ApiGet<"/patients/{id}/allergies/search">
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
    return this.http.get<ApiGet<"/patients/{id}/allergy-options">>(
      `/patients/${encodeURIComponent(patientId)}/allergy-options?${query}`,
    );
  }

  listPatientsByAllergy(allergyId: string) {
    return this.http.get<ApiGet<"/allergy-types/{id}/patients">>(
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
  private readonly crud: RestCrudRepository<
    "/appointments",
    Appointment,
    AppointmentInput,
    Api<"AppointmentResponse">
  >;

  constructor(http: HttpClient) {
    this.http = http;
    this.crud = new RestCrudRepository(http, "/appointments", {
      // The API sends null for "no reason"; the domain uses an empty string.
      fromResponse: (appointment) => ({
        ...appointment,
        reasonForVisit: appointment.reasonForVisit ?? "",
      }),
      toRequest: (input) => input,
    });
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
    return this.http.get<ApiGet<"/appointments/search">>(
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
    return this.http.get<ApiGet<"/providers/{id}/patients">>(
      `/providers/${encodeURIComponent(providerId)}/patients?${query}`,
    );
  }
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
    const result = await this.http.get<ApiGet<"/providers/directory">>(
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
            : (clinicNames.get(item.clinicId) ?? null),
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
    const result = await this.http.get<ApiGet<"/providers/search">>(
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
    const raw = await this.http.get<ApiGet<"/providers/{id}/busy-slots">>(
      `/providers/${encodeURIComponent(providerId)}/busy-slots?${queryString({ date })}`,
    );
    const list = raw?.busyStartTimes;
    if (!Array.isArray(list) || !list.every((s) => typeof s === "string"))
      throw new Error("The API returned invalid busy slots.");
    return list;
  }
}
