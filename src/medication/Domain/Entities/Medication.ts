// Datos de un horario (entrada). days: 0 = domingo ... 6 = sábado
export interface ScheduleData {
  time: string; // "HH:mm"
  daysOfWeek: number[];
  enabled: boolean;
}

export interface MedicationSchedule extends ScheduleData {
  id: string;
  medicationId: string;
}

// Datos ya validados para crear/actualizar
export interface MedicationData {
  patientId: string;
  name: string;
  description: string | null;
  dosage: string;
  instructions: string | null;
  imageUrl: string | null;
  startDate: string; // "YYYY-MM-DD"
  endDate: string | null;
  schedules: ScheduleData[];
}

export interface Medication extends Omit<MedicationData, "schedules"> {
  id: string;
  schedules: MedicationSchedule[];
  createdAt: Date;
}