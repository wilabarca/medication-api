import { RequestHandler, Router } from "express";
import { MedicationController } from "../Controllers/MedicationController";
import { authMiddleware, AuthRequest, DeviceRequest } from "../../../core/AuthMiddleware";

export function RegisterMedicationRoutes(
  router: Router,
  controller: MedicationController,
  deviceAuth: RequestHandler
): void {
  // ---- Cuidador (JWT) ----
  const group = Router();
  group.use(authMiddleware);

  group.post("/", (req, res) => controller.create(req as AuthRequest, res));
  group.get("/:id", (req, res) => controller.getById(req as AuthRequest, res));
  group.put("/:id", (req, res) => controller.update(req as AuthRequest, res));
  group.delete("/:id", (req, res) => controller.delete(req as AuthRequest, res));

  router.use("/api/medications", group);

  router.get("/api/patients/:patientId/medications", authMiddleware, (req, res) =>
    controller.getByPatient(req as AuthRequest, res)
  );

  // ---- Teléfono del paciente (device_token) ----
  router.get("/api/device/medications", deviceAuth, (req, res) =>
    controller.getForDevice(req as DeviceRequest, res)
  );
}