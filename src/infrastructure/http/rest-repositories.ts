import type { Clinic, ClinicInput, PatientAllergy } from "@/domain/entities";
import { NotFoundError } from "@/domain/errors";
import type {
  ClinicRepository,
  ConfigurationRepository,
  CrudRepository,
  PatientAllergyRepository,
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
  phoneNumber: string;
}

export class RestClinicRepository implements ClinicRepository {
  constructor(private readonly http: HttpClient) {}

  async list() {
    const clinics = await this.http.get<ClinicResponse[]>("/clinics");
    return clinics.map((clinic) => this.fromResponse(clinic));
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
      phoneNumber: clinic.phoneNumber,
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

/**
 *   GET    /patients/:patientId/allergies
 *   GET    /allergy-types/:allergyId/patients
 *   PUT    /patients/:patientId/allergies/:allergyId   (upsert)
 *   DELETE /patients/:patientId/allergies/:allergyId
 */
export class RestPatientAllergyRepository implements PatientAllergyRepository {
  constructor(private readonly http: HttpClient) {}

  listByPatient(patientId: string) {
    return this.http.get<PatientAllergy[]>(
      `/patients/${encodeURIComponent(patientId)}/allergies`,
    );
  }

  listByAllergy(allergyId: string) {
    return this.http.get<PatientAllergy[]>(
      `/allergy-types/${encodeURIComponent(allergyId)}/patients`,
    );
  }

  save(record: PatientAllergy) {
    return this.http.put<PatientAllergy>(
      `/patients/${encodeURIComponent(record.patientId)}/allergies/${encodeURIComponent(record.allergyId)}`,
      record,
    );
  }

  delete(patientId: string, allergyId: string) {
    return this.http.delete(
      `/patients/${encodeURIComponent(patientId)}/allergies/${encodeURIComponent(allergyId)}`,
    );
  }
}
