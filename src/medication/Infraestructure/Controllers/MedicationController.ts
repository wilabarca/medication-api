
import { Request, Response } from "express";
import { Medication } from "../../Domain/Entities/Medication";
import { MedicationService } from "../../Application/MedicationService";

export class MedicationController {
  constructor(
    private readonly medicationService: MedicationService
  ) {}

  /**
   * Convierte un parámetro de ruta en string
   * y evita el error string | string[] de TypeScript.
   */
  private getParam(value: unknown): string {
    if (typeof value !== "string" || !value.trim()) {
      throw new Error("Parámetro de ruta inválido");
    }

    return value.trim();
  }

  // CREAR MEDICAMENTO
  async create(req: Request, res: Response): Promise<void> {
    try {
      const medication = req.body as Medication;

      const createdMedication =
        await this.medicationService.create(medication);

      res.status(201).json({
        message: "Medicamento creado correctamente",
        data: createdMedication,
      });
    } catch (error: unknown) {
      this.handleError(res, error);
    }
  }

  // OBTENER MEDICAMENTO POR ID
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = this.getParam(req.params.id);

      const medication =
        await this.medicationService.getById(id);

      if (!medication) {
        res.status(404).json({
          message: "Medicamento no encontrado",
        });
        return;
      }

      res.status(200).json({
        data: medication,
      });
    } catch (error: unknown) {
      this.handleError(res, error);
    }
  }

  // OBTENER MEDICAMENTOS POR PACIENTE
  async getByPatientId(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const patientId = this.getParam(req.params.patientId);

      const medications =
        await this.medicationService.getByPatientId(patientId);

      res.status(200).json({
        data: medications,
      });
    } catch (error: unknown) {
      this.handleError(res, error);
    }
  }

  // OBTENER MEDICAMENTOS POR CUIDADOR
  async getByCaregiverId(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const caregiverId = this.getParam(req.params.caregiverId);

      const medications =
        await this.medicationService.getByCaregiverId(caregiverId);

      res.status(200).json({
        data: medications,
      });
    } catch (error: unknown) {
      this.handleError(res, error);
    }
  }

  // OBTENER TODOS LOS MEDICAMENTOS
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const medications = await this.medicationService.getAll();

      res.status(200).json({
        data: medications,
      });
    } catch (error: unknown) {
      this.handleError(res, error);
    }
  }

  // ACTUALIZAR MEDICAMENTO
  async update(req: Request, res: Response): Promise<void> {
    try {
      const id = this.getParam(req.params.id);

      const medication: Medication = {
        ...req.body,
        id,
      } as Medication;

      const updatedMedication =
        await this.medicationService.update(medication);

      res.status(200).json({
        message: "Medicamento actualizado correctamente",
        data: updatedMedication,
      });
    } catch (error: unknown) {
      this.handleError(res, error);
    }
  }

  // ELIMINAR MEDICAMENTO
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = this.getParam(req.params.id);

      await this.medicationService.delete(id);

      res.status(200).json({
        message: "Medicamento eliminado correctamente",
      });
    } catch (error: unknown) {
      this.handleError(res, error);
    }
  }

  // MANEJO CENTRALIZADO DE ERRORES
  private handleError(res: Response, error: unknown): void {
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor";

    if (message === "Medicamento no encontrado") {
      res.status(404).json({ message });
      return;
    }

    if (
      message === "Parámetro de ruta inválido" ||
      message.toLowerCase().includes("inválido") ||
      message.toLowerCase().includes("requerido") ||
      message.toLowerCase().includes("obligatorio") ||
      message.toLowerCase().includes("fecha") ||
      message.toLowerCase().includes("dosis") ||
      message.toLowerCase().includes("medicamento") ||
      message.toLowerCase().includes("horario") ||
      message.toLowerCase().includes("schedule") ||
      message.toLowerCase().includes("patientid") ||
      message.toLowerCase().includes("caregiverid")
    ) {
      res.status(400).json({ message });
      return;
    }

    console.error("Error en MedicationController:", error);

    res.status(500).json({
      message: "Error interno del servidor",
    });
  }
}
