import { Response } from "express";
import { MedicationService } from "../../Application/MedicationService";
import { AuthRequest, DeviceRequest } from "../../../core/AuthMiddleware";
import { sendError } from "../../../core/Errors";

export class MedicationController {
  constructor(private readonly service: MedicationService) {}

  // POST /api/medications
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const medication = await this.service.create(req.user!.id, req.body);
      res.status(201).json({ message: "Medicamento creado correctamente", data: medication });
    } catch (error) {
      sendError(res, error, "MedicationController.create");
    }
  }

  // GET /api/medications/:id
  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      res.status(200).json({ data: await this.service.getById(String(req.params.id), req.user!.id) });
    } catch (error) {
      sendError(res, error, "MedicationController.getById");
    }
  }

  // GET /api/patients/:patientId/medications
  async getByPatient(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = await this.service.listByPatient(String(req.params.patientId), req.user!.id);
      res.status(200).json({ data });
    } catch (error) {
      sendError(res, error, "MedicationController.getByPatient");
    }
  }

  // GET /api/device/medications   (teléfono del paciente, con su device_token)
  async getForDevice(req: DeviceRequest, res: Response): Promise<void> {
    try {
      res.status(200).json({ data: await this.service.listForDevice(req.patientId!) });
    } catch (error) {
      sendError(res, error, "MedicationController.getForDevice");
    }
  }

  // PUT /api/medications/:id
  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const medication = await this.service.update(String(req.params.id), req.user!.id, req.body);
      res.status(200).json({ message: "Medicamento actualizado correctamente", data: medication });
    } catch (error) {
      sendError(res, error, "MedicationController.update");
    }
  }

  // DELETE /api/medications/:id
  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      await this.service.delete(String(req.params.id), req.user!.id);
      res.status(200).json({ message: "Medicamento eliminado correctamente" });
    } catch (error) {
      sendError(res, error, "MedicationController.delete");
    }
  }
}