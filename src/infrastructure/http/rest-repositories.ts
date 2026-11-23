import type {
  AllergyType,
  Appointment,
  AppointmentInput,
  Clinic,
  ClinicInput,
  PatientAllergy,
} from "@/domain/entities";
import type {
  AppointmentListItem,
  AppointmentRepository,
  AppointmentSearchOptions,
  ConfigurationRepository,
  CrudRepository,
  DashboardData,
  DashboardRepository,
  PagedResult,
  PatientAllergyRepository,
  ProviderSearchOptions,
  SearchOptions,
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

type AppointmentListResponse = Omit<AppointmentListItem, "reasonForVisit"> & {
  reasonForVisit: string | null;
};

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

  async getDashboard() {
    const data = await this.http.get<
      Omit<DashboardData, "upcomingAppointments"> & {
        upcomingAppointments: AppointmentListResponse[];
      }
    >("/dashboard");
    return {
      ...data,
      upcomingAppointments: data.upcomingAppointments.map((item) => ({
        ...item,
        reasonForVisit: item.reasonForVisit ?? "",
      })),
    };
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

  async search(options: AppointmentSearchOptions) {
    const query = queryString({
      Search: options.search,
      From: options.from,
      To: options.to,
      ClinicId: options.clinicId,
      ProviderId: options.providerId,
      PatientId: options.patientId,
      Page: options.page,
      PageSize: options.pageSize,
    });
    const result = await this.http.get<PagedResult<AppointmentListResponse>>(
      `/appointments/search?${query}`,
    );
    return {
      ...result,
      items: result.items.map((item) => ({
        ...item,
        reasonForVisit: item.reasonForVisit ?? "",
      })),
    };
  }
}
