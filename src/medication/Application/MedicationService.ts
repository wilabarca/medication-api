
import { Medication } from "../Domain/Entities/Medication";
import { MedicationRepository } from "../Domain/Repositories/MedicationRepository";

export class MedicationService {
  constructor(
    private readonly medicationRepository: MedicationRepository
  ) {}

  async create(medication: Medication): Promise<Medication> {
    this.validateMedication(medication);

    return await this.medicationRepository.create(medication);
  }

  async getById(id: string): Promise<Medication | null> {
    this.validateId(id);

    return await this.medicationRepository.getById(id);
  }

  async getByPatientId(patientId: string): Promise<Medication[]> {
    this.validateId(patientId);

    return await this.medicationRepository.getByPatientId(patientId);
  }

  async getByCaregiverId(caregiverId: string): Promise<Medication[]> {
    this.validateId(caregiverId);

    return await this.medicationRepository.getByCaregiverId(caregiverId);
  }

  async getAll(): Promise<Medication[]> {
    return await this.medicationRepository.getAll();
  }

  async update(medication: Medication): Promise<Medication> {
    this.validateId(medication.id);
    this.validateMedication(medication);

    const existingMedication =
      await this.medicationRepository.getById(medication.id);

    if (!existingMedication) {
      throw new Error("Medicamento no encontrado");
    }

    return await this.medicationRepository.update(medication);
  }

  async delete(id: string): Promise<void> {
    this.validateId(id);

    const existingMedication =
      await this.medicationRepository.getById(id);

    if (!existingMedication) {
      throw new Error("Medicamento no encontrado");
    }

    await this.medicationRepository.delete(id);
  }

  private validateMedication(medication: Medication): void {
    if (!medication.patientId?.trim()) {
      throw new Error("El ID del paciente es obligatorio");
    }

    if (!medication.caregiverId?.trim()) {
      throw new Error("El ID del cuidador es obligatorio");
    }

    if (!medication.name?.trim()) {
      throw new Error("El nombre del medicamento es obligatorio");
    }

    if (!medication.dosage?.trim()) {
      throw new Error("La dosis del medicamento es obligatoria");
    }

    if (
      medication.endDate &&
      medication.endDate < medication.startDate
    ) {
      throw new Error(
        "La fecha de finalización no puede ser anterior a la fecha de inicio"
      );
    }

    if (!Array.isArray(medication.schedules)) {
      throw new Error("Los horarios del medicamento no son válidos");
    }

    for (const schedule of medication.schedules) {
      if (!schedule.time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.time)) {
        throw new Error("Cada horario debe tener el formato HH:mm");
      }

      if (
        !Array.isArray(schedule.daysOfWeek) ||
        schedule.daysOfWeek.length === 0 ||
        schedule.daysOfWeek.some(
          (day) => !Number.isInteger(day) || day < 0 || day > 6
        )
      ) {
        throw new Error(
          "Cada horario debe tener al menos un día válido de la semana (0-6)"
        );
      }
    }
  }

  private validateId(id: string): void {
    if (!id?.trim()) {
      throw new Error("El identificador es obligatorio");
    }
  }
}
