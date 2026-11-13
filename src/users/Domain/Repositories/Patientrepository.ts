import { Patient, PatientData } from "../Entities/Patient"

export interface PatientRepository {
  create(caregiverId: string, data: PatientData): Promise<Patient>;

  // Siempre filtran por cuidador: uno nunca ve pacientes de otro
  getOwned(id: string, caregiverId: string): Promise<Patient | null>;
  listByCaregiver(caregiverId: string): Promise<Patient[]>;
  update(id: string, caregiverId: string, data: Partial<PatientData>): Promise<Patient | null>;
  delete(id: string, caregiverId: string): Promise<boolean>;

  // Vinculación por código / QR
  setLinkCode(id: string, caregiverId: string, code: string, expiresAt: Date): Promise<boolean>;
  findByValidLinkCode(code: string): Promise<Patient | null>;
  consumeLinkCode(id: string, code: string): Promise<boolean>;

  // Teléfono del paciente
  upsertDevice(patientId: string, deviceId: string, tokenHash: string): Promise<void>;
  findPatientIdByTokenHash(tokenHash: string): Promise<string | null>;
}