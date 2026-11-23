import {
  type Patient,
  type PatientInput,
  validatePatient,
} from "@/domain/entities";
import { assertNoDependents } from "@/domain/errors";
import type {
  AppointmentRepository,
  PatientAllergyRepository,
  PatientRepository,
} from "@/domain/repositories";
import { CrudService } from "./crud-service";

export class PatientService extends CrudService<Patient, PatientInput> {
  constructor(
    patientRepo: PatientRepository,
    private readonly appointments: AppointmentRepository,
    private readonly patientAllergies: PatientAllergyRepository,
  ) {
    super(patientRepo, "Patient");
  }
  protected validate = validatePatient;
  protected async ensureDeletable(id: string) {
    const { totalCount: count } = await this.appointments.search({
      page: 1,
      pageSize: 1,
      patientId: id,
    });
    assertNoDependents(
      count,
      (n) => `Cannot delete: patient has ${n} appointment(s).`,
    );
  }
  /** Cascades the patient's allergy records (owned data) before removing the patient. */
  async delete(id: string): Promise<void> {
    await this.ensureDeletable(id);
    const records = await this.patientAllergies.listByPatient(id);
    await Promise.all(
      records.map((pa) =>
        this.patientAllergies.delete(pa.patientId, pa.allergyId),
      ),
    );
    await this.repo.delete(id);
  }
}
