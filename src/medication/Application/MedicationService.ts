import {
  Medication,
  MedicationData,
  ScheduleData,
} from "../Domain/Entities/Medication";
import { MedicationRepository } from "../Domain/Repositories/MedicationRepository";
import { NotFoundError, ValidationError, requireId } from "../../core/Errors";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_SCHEDULES = 24;

export class MedicationService {
  constructor(private readonly repository: MedicationRepository) {}

  // El cuidador sale del JWT, nunca del body
  async create(caregiverId: string, body: any): Promise<Medication> {
    const patientId = requireId(body?.patientId, "ID del paciente");
    const data = this.parseFields(body);

    if (!(await this.repository.patientBelongsTo(patientId, caregiverId))) {
      throw new NotFoundError("Paciente no encontrado");
    }

    return this.repository.create({ ...data, patientId });
  }

  async getById(id: string, caregiverId: string): Promise<Medication> {
    const medication = await this.repository.getOwned(requireId(id, "ID del medicamento"), caregiverId);
    if (!medication) throw new NotFoundError("Medicamento no encontrado");
    return medication;
  }

  async listByPatient(patientId: string, caregiverId: string): Promise<Medication[]> {
    const id = requireId(patientId, "ID del paciente");
    if (!(await this.repository.patientBelongsTo(id, caregiverId))) {
      throw new NotFoundError("Paciente no encontrado");
    }
    return this.repository.getByPatientId(id);
  }

  // Teléfono del paciente: ya autenticado con su device_token
  async listForDevice(patientId: string): Promise<Medication[]> {
    return this.repository.getByPatientId(patientId);
  }

  async update(id: string, caregiverId: string, body: any): Promise<Medication> {
    const medication = await this.getById(id, caregiverId);
    return this.repository.update(medication.id, this.parseFields(body));
  }

  async delete(id: string, caregiverId: string): Promise<void> {
    const medication = await this.getById(id, caregiverId);
    await this.repository.delete(medication.id);
  }

  // ---------- validación ----------
  private parseFields(body: any): Omit<MedicationData, "patientId"> {
    const name = this.requiredText(body?.name, "El nombre del medicamento", 150);
    const dosage = this.requiredText(body?.dosage, "La dosis del medicamento", 100);

    const startDate = this.parseDate(body?.startDate, "fecha de inicio", true)!;
    const endDate = this.parseDate(body?.endDate, "fecha de finalización", false);
    if (endDate && endDate < startDate) {
      throw new ValidationError("La fecha de finalización no puede ser anterior a la de inicio");
    }

    return {
      name,
      dosage,
      description: this.optionalText(body?.description, "La descripción", 5000),
      instructions: this.optionalText(body?.instructions, "Las indicaciones", 5000),
      imageUrl: this.optionalText(body?.imageUrl, "La URL de la imagen", 500),
      startDate,
      endDate,
      schedules: this.parseSchedules(body?.schedules),
    };
  }

  private parseSchedules(value: unknown): ScheduleData[] {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) {
      throw new ValidationError("Los horarios del medicamento no son válidos");
    }
    if (value.length > MAX_SCHEDULES) {
      throw new ValidationError(`Máximo ${MAX_SCHEDULES} horarios por medicamento`);
    }

    return value.map((s: any) => {
      if (typeof s?.time !== "string" || !TIME_RE.test(s.time)) {
        throw new ValidationError("Cada horario debe tener el formato HH:mm");
      }
      if (
        !Array.isArray(s.daysOfWeek) ||
        s.daysOfWeek.length === 0 ||
        s.daysOfWeek.some((d: unknown) => !Number.isInteger(d) || (d as number) < 0 || (d as number) > 6)
      ) {
        throw new ValidationError("Cada horario debe tener al menos un día válido de la semana (0-6)");
      }

      const days = [...new Set<number>(s.daysOfWeek)].sort((a, b) => a - b);
      return { time: s.time, daysOfWeek: days, enabled: s.enabled === undefined ? true : Boolean(s.enabled) };
    });
  }

  private parseDate(value: unknown, label: string, required: boolean): string | null {
    if (value === undefined || value === null || value === "") {
      if (required) throw new ValidationError(`La ${label} es obligatoria`);
      return null;
    }
    if (typeof value !== "string" || !DATE_RE.test(value) ||
        new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) {
      throw new ValidationError(`La ${label} debe tener el formato YYYY-MM-DD`);
    }
    return value;
  }

  private requiredText(value: unknown, label: string, max: number): string {
    if (typeof value !== "string" || !value.trim()) {
      throw new ValidationError(`${label} es obligatorio`);
    }
    if (value.trim().length > max) {
      throw new ValidationError(`${label} no puede superar ${max} caracteres`);
    }
    return value.trim();
  }

  private optionalText(value: unknown, label: string, max: number): string | null {
    if (value === undefined || value === null) return null;
    if (typeof value !== "string" || value.trim().length > max) {
      throw new ValidationError(`${label} no es válido (máx. ${max} caracteres)`);
    }
    return value.trim() || null;
  }
}