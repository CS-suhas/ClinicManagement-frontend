import { type PatientAllergy, validatePatientAllergy } from "@/domain/entities";
import { assertValid } from "@/domain/errors";
import type {
  PatientAllergyRepository,
  SearchOptions,
} from "@/domain/repositories";

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

  /** Throws ValidationError when `record` is invalid; call before optimistic UI. */
  validateInput(record: PatientAllergy): void {
    assertValid(validatePatientAllergy(record));
  }

  /** Adds or upserts an allergy on a patient. */
  async add(record: PatientAllergy): Promise<PatientAllergy> {
    this.validateInput(record);
    return this.repo.add(record);
  }

  /** Updates severity/notes of an existing record. */
  update(record: PatientAllergy): Promise<PatientAllergy> {
    this.validateInput(record);
    return this.repo.save(record);
  }

  remove(patientId: string, allergyId: string): Promise<void> {
    return this.repo.delete(patientId, allergyId);
  }
}
