import type {
  AllergyType,
  Appointment,
  AppointmentInput,
  Clinic,
  ClinicInput,
  PatientAllergy,
} from "@/domain/entities";
import { NotFoundError } from "@/domain/errors";
import type {
  AppointmentListItem,
  AppointmentRepository,
  AppointmentSearchOptions,
  ClinicRepository,
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

/**
 * REST adapter. Expected API shape (camelCase JSON):
 *   GET    {resource}        -> T[]
 *   GET    {resource}/:id    -> T
 *   POST   {resource}        -> T
 *   PUT    {resource}/:id    -> T
 *   DELETE {resource}/:id
 */
export class RestCrudRepository<T extends { id: string }, TInput>
  implements CrudRepository<T, TInput>
{
  constructor(
    private readonly http: HttpClient,
    private readonly resource: string,
  ) {}

  list() {
    return this.http.get<T[]>(this.resource);
  }

  search(options: SearchOptions | ProviderSearchOptions) {
    const params = new URLSearchParams();
    if (options.search) params.set("Search", options.search);
    params.set("Page", String(options.page));
    params.set("PageSize", String(options.pageSize));
    if ("clinicId" in options && options.clinicId)
      params.set("clinicId", options.clinicId);
    return this.http.get<PagedResult<T>>(
      `${this.resource}/search?${params.toString()}`,
    );
  }

  async getById(id: string) {
    try {
      return await this.http.get<T>(
        `${this.resource}/${encodeURIComponent(id)}`,
      );
    } catch (e) {
      if (e instanceof NotFoundError) return null;
      throw e;
    }
  }

  create(input: TInput) {
    return this.http.post<T>(this.resource, {
      ...input,
      id: crypto.randomUUID(),
    });
  }

  update(id: string, input: TInput) {
    return this.http.put<T>(`${this.resource}/${encodeURIComponent(id)}`, {
      ...input,
      id,
    });
  }

  delete(id: string) {
    return this.http.delete(`${this.resource}/${encodeURIComponent(id)}`);
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

export class RestClinicRepository implements ClinicRepository {
  constructor(private readonly http: HttpClient) {}

  async list() {
    const clinics = await this.http.get<ClinicResponse[]>("/clinics");
    return clinics.map((clinic) => this.fromResponse(clinic));
  }

  async search(options: SearchOptions) {
    const params = new URLSearchParams();
    if (options.search) params.set("Search", options.search);
    params.set("Page", String(options.page));
    params.set("PageSize", String(options.pageSize));
    const result = await this.http.get<PagedResult<ClinicResponse>>(
      `/clinics/search?${params.toString()}`,
    );
    return {
      ...result,
      items: result.items.map((clinic) => this.fromResponse(clinic)),
    };
  }

  async getById(id: string) {
    try {
      const clinic = await this.http.get<ClinicResponse>(
        `/clinics/${encodeURIComponent(id)}`,
      );
      return this.fromResponse(clinic);
    } catch (e) {
      if (e instanceof NotFoundError) return null;
      throw e;
    }
  }

  async create(input: ClinicInput) {
    const clinic = await this.http.post<ClinicResponse>("/clinics", {
      ...this.toRequest(input),
      id: crypto.randomUUID(),
    });
    return this.fromResponse(clinic);
  }

  async update(id: string, input: ClinicInput) {
    const clinic = await this.http.put<ClinicResponse>(
      `/clinics/${encodeURIComponent(id)}`,
      { ...this.toRequest(input), id },
    );
    return this.fromResponse(clinic);
  }

  delete(id: string) {
    return this.http.delete(`/clinics/${encodeURIComponent(id)}`);
  }

  private fromResponse(clinic: ClinicResponse): Clinic {
    return {
      id: clinic.id,
      name: clinic.name,
      location: clinic.address,
      phoneNumber: clinic.phoneNumber ?? "",
    };
  }

  private toRequest(input: ClinicInput) {
    return {
      name: input.name,
      address: input.location,
      phoneNumber: input.phoneNumber,
    };
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
    const params = new URLSearchParams();
    if (options.search) params.set("Search", options.search);
    params.set("Page", String(options.page));
    params.set("PageSize", String(options.pageSize));
    const result = await this.http.get<
      PagedResult<{
        id: string;
        allergyId: string;
        name: string;
        severity: string;
        notes: string | null;
      }>
    >(
      `/patients/${encodeURIComponent(patientId)}/allergies/search?${params.toString()}`,
    );
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
    const params = new URLSearchParams();
    if (options.search) params.set("Search", options.search);
    if (options.selectedAllergyId)
      params.set("selectedAllergyId", options.selectedAllergyId);
    params.set("Page", String(options.page));
    params.set("PageSize", String(options.pageSize));
    return this.http.get<PagedResult<AllergyType>>(
      `/patients/${encodeURIComponent(patientId)}/allergy-options?${params.toString()}`,
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

  create(input: AppointmentInput) {
    return this.crud.create(input);
  }

  update(id: string, input: AppointmentInput) {
    return this.crud.update(id, input);
  }

  delete(id: string) {
    return this.crud.delete(id);
  }

  async search(options: AppointmentSearchOptions) {
    const params = new URLSearchParams();
    if (options.search) params.set("Search", options.search);
    if (options.from) params.set("From", options.from);
    if (options.to) params.set("To", options.to);
    if (options.clinicId) params.set("ClinicId", options.clinicId);
    if (options.providerId) params.set("ProviderId", options.providerId);
    if (options.patientId) params.set("PatientId", options.patientId);
    params.set("Page", String(options.page));
    params.set("PageSize", String(options.pageSize));
    const result = await this.http.get<PagedResult<AppointmentListResponse>>(
      `/appointments/search?${params.toString()}`,
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
