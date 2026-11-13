import { Request, Response } from "express";
import { PatientService } from "../../Application/Patientservice";
import { AuthRequest } from "../../../core/AuthMiddleware";
import { sendError } from "../../../core/Errors";


export class PatientController {
  constructor(private readonly service: PatientService) {}

  // POST /api/patients
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const patient = await this.service.create(req.user!.id, req.body);
      res.status(201).json({ message: "Paciente creado correctamente", data: patient });
    } catch (error) {
      sendError(res, error, "PatientController.create");
    }
  }

  // GET /api/patients
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      res.status(200).json({ data: await this.service.list(req.user!.id) });
    } catch (error) {
      sendError(res, error, "PatientController.list");
    }
  }

  // GET /api/patients/:id
  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      res.status(200).json({ data: await this.service.getById(String(req.params.id), req.user!.id) });
    } catch (error) {
      sendError(res, error, "PatientController.getById");
    }
  }

  // PUT /api/patients/:id
  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const patient = await this.service.update(String(req.params.id), req.user!.id, req.body);
      res.status(200).json({ message: "Paciente actualizado correctamente", data: patient });
    } catch (error) {
      sendError(res, error, "PatientController.update");
    }
  }

  // DELETE /api/patients/:id
  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      await this.service.delete(String(req.params.id), req.user!.id);
      res.status(200).json({ message: "Paciente eliminado correctamente" });
    } catch (error) {
      sendError(res, error, "PatientController.delete");
    }
  }

  // POST /api/patients/:id/link-code   (el celular del cuidador lo convierte en QR)
  async generateLinkCode(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await this.service.generateLinkCode(String(req.params.id), req.user!.id);
      res.status(200).json({ data: result });
    } catch (error) {
      sendError(res, error, "PatientController.generateLinkCode");
    }
  }

  // POST /api/patients/link   (público: lo llama el celular del paciente)
  async link(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.service.linkDevice(req.body?.code, req.body?.deviceId);
      if (!result) {
        res.status(400).json({ message: "Código inválido o expirado" });
        return;
      }
      res.status(200).json({ message: "Dispositivo vinculado correctamente", data: result });
    } catch (error) {
      sendError(res, error, "PatientController.link");
    }
  }
}