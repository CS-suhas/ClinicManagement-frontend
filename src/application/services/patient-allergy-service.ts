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

  listPatientsByAllergy(allergyId: string) {
    return this.repo.listPatientsByAllergy(allergyId);
  }

  allergyOptions(
    patientId: string,
    options: SearchOptions & { selectedAllergyId?: string },
  ) {
    return this.repo.allergyOptions(patientId, options);
  }

  validateInput(record: PatientAllergy): void {
    assertValid(validatePatientAllergy(record));
  }

  async add(record: PatientAllergy): Promise<PatientAllergy> {
    this.validateInput(record);
    return this.repo.add(record);
  }

  update(record: PatientAllergy): Promise<PatientAllergy> {
    this.validateInput(record);
    return this.repo.save(record);
  }

  remove(patientId: string, allergyId: string): Promise<void> {
    return this.repo.delete(patientId, allergyId);
  }
}
