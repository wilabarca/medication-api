import { Request, Response } from "express";
import {
  UserService,
  EmailAlreadyRegisteredError,
} from "../../Application/UserService";
import { User } from "../../Domain/Entities/User";
import { AuthRequest } from "../../../core/AuthMiddleware";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Nunca devolver el hash
function toSafeUser({ password: _password, ...safe }: User) {
  return safe;
}

export class UserController {
  constructor(private userService: UserService) {}

  // POST /api/auth/register  (registra un cuidador)
  async register(req: Request, res: Response): Promise<Response> {
    try {
      const { name, email, password } = req.body ?? {};

      if (!name || !email || !password) {
        return res
          .status(400)
          .json({ message: "Nombre, correo y contraseña son obligatorios" });
      }
      if (typeof email !== "string" || !EMAIL_RE.test(email)) {
        return res.status(400).json({ message: "Correo electrónico inválido" });
      }
      if (typeof password !== "string" || password.length < 8) {
        return res
          .status(400)
          .json({ message: "La contraseña debe tener al menos 8 caracteres" });
      }

      const user = await this.userService.createUser({ name, email, password });

      return res.status(201).json({
        message: "Cuidador registrado correctamente",
        user: toSafeUser(user),
      });
    } catch (error) {
      if (error instanceof EmailAlreadyRegisteredError) {
        return res.status(409).json({ message: error.message });
      }
      console.error(error);
      return res.status(500).json({ message: "Error al registrar el usuario" });
    }
  }

  // POST /api/auth/login
  async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body ?? {};

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "El correo y la contraseña son obligatorios" });
      }

      const result = await this.userService.login(email, password);

      if (!result) {
        return res.status(401).json({ message: "Credenciales incorrectas" });
      }

      return res.status(200).json({
        message: "Inicio de sesión exitoso",
        token: result.token,
        user: toSafeUser(result.user),
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Error al iniciar sesión" });
    }
  }

  // GET /api/auth/me  (requiere authMiddleware)
  async me(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const user = await this.userService.getUserById(req.user!.id);

      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      return res.status(200).json(toSafeUser(user));
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Error al obtener el usuario" });
    }
  }
}