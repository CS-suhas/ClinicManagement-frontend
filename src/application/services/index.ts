import {
  type AllergyType,
  type AllergyTypeInput,
  type Appointment,
  type AppointmentInput,
  type Clinic,
  type ClinicInput,
  type Patient,
  type PatientAllergy,
  type PatientInput,
  type Provider,
  type ProviderInput,
  validateAllergyType,
  validateAppointment,
  validateClinic,
  validatePatient,
  validatePatientAllergy,
  validateProvider,
} from "@/domain/entities";
import { assertValid, ConflictError } from "@/domain/errors";
import type {
  AllergyTypeRepository,
  AppointmentRepository,
  AppointmentSearchOptions,
  ClinicRepository,
  DashboardRepository,
  PatientAllergyRepository,
  PatientRepository,
  ProviderRepository,
  ProviderSearchOptions,
  SearchOptions,
} from "@/domain/repositories";
import { CrudService } from "./crud-service";

export { ConfigurationService } from "./configuration-service";
export { CrudService } from "./crud-service";

export class ClinicService extends CrudService<Clinic, ClinicInput> {
  constructor(
    private readonly clinicRepo: ClinicRepository,
    private readonly providers: ProviderRepository,
  ) {
    super(clinicRepo, "Clinic");
  }
  protected validate = validateClinic;
  search(options: SearchOptions) {
    return this.clinicRepo.search(options);
  }
  protected async ensureDeletable(id: string) {
    const { totalCount: count } = await this.providers.search({
      page: 1,
      pageSize: 1,
      clinicId: id,
    });
    if (count > 0)
      throw new ConflictError(
        `Cannot delete: ${count} provider(s) still belong to this clinic.`,
      );
  }
}

export class ProviderService extends CrudService<Provider, ProviderInput> {
  constructor(
    private readonly providerRepo: ProviderRepository,
    private readonly appointments: AppointmentRepository,
  ) {
    super(providerRepo, "Provider");
  }
  protected validate = validateProvider;
  search(options: ProviderSearchOptions) {
    return this.providerRepo.search(options);
  }
  protected async ensureDeletable(id: string) {
    const { totalCount: count } = await this.appointments.search({
      page: 1,
      pageSize: 1,
      providerId: id,
    });
    if (count > 0)
      throw new ConflictError(
        `Cannot delete: provider has ${count} appointment(s).`,
      );
  }
}

export class PatientService extends CrudService<Patient, PatientInput> {
  constructor(
    private readonly patientRepo: PatientRepository,
    private readonly appointments: AppointmentRepository,
    private readonly patientAllergies: PatientAllergyRepository,
  ) {
    super(patientRepo, "Patient");
  }
  protected validate = validatePatient;
  search(options: SearchOptions) {
    return this.patientRepo.search(options);
  }
  protected async ensureDeletable(id: string) {
    const { totalCount: count } = await this.appointments.search({
      page: 1,
      pageSize: 1,
      patientId: id,
    });
    if (count > 0)
      throw new ConflictError(
        `Cannot delete: patient has ${count} appointment(s).`,
      );
  }
  /** Cascades the patient's allergy records (owned data) before removing the patient. */
  async delete(id: string): Promise<void> {
    await this.ensureDeletable(id);
    for (const pa of await this.patientAllergies.listByPatient(id)) {
      await this.patientAllergies.delete(pa.patientId, pa.allergyId);
    }
    await this.repo.delete(id);
  }
}

export class AllergyTypeService extends CrudService<
  AllergyType,
  AllergyTypeInput
> {
  constructor(
    private readonly allergyTypeRepo: AllergyTypeRepository,
    private readonly patientAllergies: PatientAllergyRepository,
  ) {
    super(allergyTypeRepo, "Allergy type");
  }
  protected validate = validateAllergyType;
  search(options: SearchOptions) {
    return this.allergyTypeRepo.search(options);
  }
  protected async ensureDeletable(id: string) {
    const count = (await this.patientAllergies.listByAllergy(id)).length;
    if (count > 0)
      throw new ConflictError(
        `Cannot delete: ${count} patient(s) have this allergy recorded.`,
      );
  }
}

export class AppointmentService extends CrudService<
  Appointment,
  AppointmentInput
> {
  constructor(private readonly appointmentRepo: AppointmentRepository) {
    super(appointmentRepo, "Appointment");
  }
  protected validate = validateAppointment;
  search(options: AppointmentSearchOptions) {
    return this.appointmentRepo.search(options);
  }
}

export class PatientAllergyService {
  constructor(private readonly repo: PatientAllergyRepository) {}

  listByPatient(patientId: string): Promise<PatientAllergy[]> {
    return this.repo.listByPatient(patientId);
  }

  searchByPatient(patientId: string, options: SearchOptions) {
    return this.repo.searchByPatient(patientId, options);
  }

  allergyOptions(
    patientId: string,
    options: SearchOptions & { selectedAllergyId?: string },
  ) {
    return this.repo.allergyOptions(patientId, options);
  }

  /** Adds or upserts an allergy on a patient. */
  async add(record: PatientAllergy): Promise<PatientAllergy> {
    assertValid(validatePatientAllergy(record));
    return this.repo.add(record);
  }

  /** Updates severity/notes of an existing record. */
  update(record: PatientAllergy): Promise<PatientAllergy> {
    assertValid(validatePatientAllergy(record));
    return this.repo.save(record);
  }

  remove(patientId: string, allergyId: string): Promise<void> {
    return this.repo.delete(patientId, allergyId);
  }
}

export class DashboardService {
  constructor(private readonly repo: DashboardRepository) {}

  getDashboard() {
    return this.repo.getDashboard();
  }
}
