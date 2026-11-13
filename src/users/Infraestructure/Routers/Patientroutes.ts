import { Router } from "express";
import rateLimit from "express-rate-limit";
import { PatientController } from "../Controllers/Patientscontroller";
import { authMiddleware, AuthRequest } from "../../../core/AuthMiddleware";

// Un código de 6 caracteres se puede adivinar por fuerza bruta: limitar intentos
const linkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Demasiados intentos, inténtalo más tarde" },
});

export function RegisterPatientRoutes(
  router: Router,
  controller: PatientController
): void {
  const group = Router();

  // Pública (la usa el paciente, que aún no tiene token). Va antes del authMiddleware.
  group.post("/link", linkLimiter, (req, res) => controller.link(req, res));

  // Todo lo demás requiere el JWT del cuidador
  group.use(authMiddleware);

  group.post("/", (req, res) => controller.create(req as AuthRequest, res));
  group.get("/", (req, res) => controller.list(req as AuthRequest, res));
  group.get("/:id", (req, res) => controller.getById(req as AuthRequest, res));
  group.put("/:id", (req, res) => controller.update(req as AuthRequest, res));
  group.delete("/:id", (req, res) => controller.delete(req as AuthRequest, res));
  group.post("/:id/link-code", (req, res) =>
    controller.generateLinkCode(req as AuthRequest, res)
  );

  router.use("/api/patients", group);
}