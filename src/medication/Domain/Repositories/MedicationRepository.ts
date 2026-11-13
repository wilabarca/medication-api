import { Medication, MedicationData } from "../Entities/Medication";

export interface MedicationRepository {
  create(data: MedicationData): Promise<Medication>;

  // Solo devuelve el medicamento si su paciente pertenece al cuidador
  getOwned(id: string, caregiverId: string): Promise<Medication | null>;

  getByPatientId(patientId: string): Promise<Medication[]>;

  // El paciente de un medicamento no se puede cambiar
  update(id: string, data: Omit<MedicationData, "patientId">): Promise<Medication>;

  delete(id: string): Promise<void>;

  patientBelongsTo(patientId: string, caregiverId: string): Promise<boolean>;
}