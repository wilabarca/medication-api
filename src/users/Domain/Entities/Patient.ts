export interface Patient {
  id: string;
  caregiverId: string;
  name: string;
  age: number | null;
  gender: string | null;
  linkedDevices: number; // teléfonos vinculados; > 0 = el paciente ya escaneó el QR
  createdAt: Date;
}

export interface PatientData {
  name: string;
  age: number | null;
  gender: string | null;
}