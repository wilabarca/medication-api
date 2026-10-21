import { Medication } from "../Entities/Medication";

export interface MedicationRepository {
  create(medication: Medication): Promise<Medication>;

  getById(id: string): Promise<Medication | null>;

  getByPatientId(patientId: string): Promise<Medication[]>;

  getByCaregiverId(caregiverId: string): Promise<Medication[]>;

  getAll(): Promise<Medication[]>;

  update(medication: Medication): Promise<Medication>;

  delete(id: string): Promise<void>;
}