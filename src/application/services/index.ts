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
  ClinicRepository,
  PatientAllergyRepository,
  PatientRepository,
  ProviderRepository,
} from "@/domain/repositories";
import { CrudService } from "./crud-service";

export { ConfigurationService } from "./configuration-service";
export { CrudService } from "./crud-service";

export class ClinicService extends CrudService<Clinic, ClinicInput> {
  constructor(
    repo: ClinicRepository,
    private readonly providers: ProviderRepository,
  ) {
    super(repo, "Clinic");
  }
  protected validate = validateClinic;
  protected async ensureDeletable(id: string) {
    const count = (await this.providers.list()).filter(
      (p) => p.clinicId === id,
    ).length;
    if (count > 0)
      throw new ConflictError(
        `Cannot delete: ${count} provider(s) still belong to this clinic.`,
      );
  }
}

export class ProviderService extends CrudService<Provider, ProviderInput> {
  constructor(
    repo: ProviderRepository,
    private readonly appointments: AppointmentRepository,
  ) {
    super(repo, "Provider");
  }
  protected validate = validateProvider;
  protected async ensureDeletable(id: string) {
    const count = (await this.appointments.list()).filter(
      (a) => a.providerId === id,
    ).length;
    if (count > 0)
      throw new ConflictError(
        `Cannot delete: provider has ${count} appointment(s).`,
      );
  }
}

export class PatientService extends CrudService<Patient, PatientInput> {
  constructor(
    repo: PatientRepository,
    private readonly appointments: AppointmentRepository,
    private readonly patientAllergies: PatientAllergyRepository,
  ) {
    super(repo, "Patient");
  }
  protected validate = validatePatient;
  protected async ensureDeletable(id: string) {
    const count = (await this.appointments.list()).filter(
      (a) => a.patientId === id,
    ).length;
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
    repo: AllergyTypeRepository,
    private readonly patientAllergies: PatientAllergyRepository,
  ) {
    super(repo, "Allergy type");
  }
  protected validate = validateAllergyType;
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
  constructor(repo: AppointmentRepository) {
    super(repo, "Appointment");
  }
  protected validate = validateAppointment;
}

export class PatientAllergyService {
  constructor(private readonly repo: PatientAllergyRepository) {}

  listByPatient(patientId: string): Promise<PatientAllergy[]> {
    return this.repo.listByPatient(patientId);
  }

  /** Adds a new allergy to a patient; rejects duplicates. */
  async add(record: PatientAllergy): Promise<PatientAllergy> {
    assertValid(validatePatientAllergy(record));
    const existing = await this.repo.listByPatient(record.patientId);
    if (existing.some((e) => e.allergyId === record.allergyId))
      throw new ConflictError(
        "This allergy is already recorded for the patient.",
      );
    return this.repo.save(record);
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
