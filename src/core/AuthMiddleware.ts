import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

export interface DeviceRequest extends Request {
  patientId?: string;
}

// Rutas del CUIDADOR: Authorization: Bearer <jwt>
export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Token no proporcionado" });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ message: "Error de configuración del servidor" });
    return;
  }

  try {
    const payload = jwt.verify(header.slice(7), secret) as jwt.JwtPayload;
    req.user = { id: String(payload.id), email: String(payload.email) };
    next();
  } catch {
    res.status(401).json({ message: "Token inválido o expirado" });
  }
}

// Rutas del TELÉFONO DEL PACIENTE: Authorization: Bearer <device_token>
export function deviceAuthMiddleware(
  authenticate: (token: string) => Promise<string | null>
): RequestHandler {
  return async (req, res, next) => {
    const header = req.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ message: "Token del dispositivo no proporcionado" });
      return;
    }

    try {
      const patientId = await authenticate(header.slice(7));
      if (!patientId) {
        res.status(401).json({ message: "Dispositivo no vinculado" });
        return;
      }
      (req as DeviceRequest).patientId = patientId;
      next();
    } catch (error) {
      console.error("Error autenticando dispositivo:", error);
      res.status(500).json({ message: "Error al autenticar el dispositivo" });
    }
  };
}