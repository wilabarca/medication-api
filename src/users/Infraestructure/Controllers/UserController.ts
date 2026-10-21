
import { Request, Response } from "express";
import { UserService } from "../../Application/UserService";
import { User, UserRole } from "../../Domain/Entities/User";

export class UserController {
  constructor(private userService: UserService) {}

  // Crear usuario: paciente o cuidador
  async createUser(req: Request, res: Response): Promise<Response> {
    try {
      const { name, email, password, role } = req.body;

      if (!name || !email || !password || !role) {
        return res.status(400).json({
          message: "Todos los campos son obligatorios",
        });
      }

      if (!["PATIENT", "CAREGIVER"].includes(role)) {
        return res.status(400).json({
          message: "El rol debe ser PATIENT o CAREGIVER",
        });
      }

      const user: User = {
        id: "",
        name,
        email,
        password,
        role: role as UserRole,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const newUser = await this.userService.createUser(user);

      // No devolver la contraseña hasheada
      const { password: _, ...safeUser } = newUser;

      return res.status(201).json({
        message: "Usuario registrado correctamente",
        user: safeUser,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "El correo electrónico ya está registrado"
      ) {
        return res.status(409).json({
          message: error.message,
        });
      }

      return res.status(500).json({
        message: "Error al registrar el usuario",
      });
    }
  }

  // Iniciar sesión
  async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          message: "El correo y la contraseña son obligatorios",
        });
      }

      const token = await this.userService.login(email, password);

      if (!token) {
        return res.status(401).json({
          message: "Credenciales incorrectas",
        });
      }

      return res.status(200).json({
        message: "Inicio de sesión exitoso",
        token,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error al iniciar sesión",
      });
    }
  }

  // Obtener todos los usuarios
  async getAllUsers(
    _req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const users = await this.userService.getAllUsers();

      const safeUsers = users.map(
        ({ password: _, ...user }) => user
      );

      return res.status(200).json(safeUsers);
    } catch (error) {
      return res.status(500).json({
        message: "Error al obtener los usuarios",
      });
    }
  }

  // Obtener usuario por ID
  async getUserById(
    req: Request<{ id: string }>,
    res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;

      const user = await this.userService.getUserById(id);

      if (!user) {
        return res.status(404).json({
          message: "Usuario no encontrado",
        });
      }

      const { password: _, ...safeUser } = user;

      return res.status(200).json(safeUser);
    } catch (error) {
      return res.status(500).json({
        message: "Error al obtener el usuario",
      });
    }
  }

  // Actualizar datos del usuario
  async updateUser(
    req: Request<{ id: string }>,
    res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;
      const { name, email } = req.body;

      if (!name && !email) {
        return res.status(400).json({
          message: "Debes proporcionar al menos un campo para actualizar",
        });
      }

      const existingUser = await this.userService.getUserById(id);

      if (!existingUser) {
        return res.status(404).json({
          message: "Usuario no encontrado",
        });
      }

      // No permitir cambiar el rol ni la contraseña desde este endpoint
      const updatedUser: User = {
        ...existingUser,
        name: name ?? existingUser.name,
        email: email ?? existingUser.email,
        updated_at: new Date(),
      };

      const user = await this.userService.updateUser(updatedUser);

      const { password: _, ...safeUser } = user;

      return res.status(200).json({
        message: "Usuario actualizado correctamente",
        user: safeUser,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error al actualizar el usuario",
      });
    }
  }

  // Eliminar usuario
  async deleteUser(
    req: Request<{ id: string }>,
    res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;

      const existingUser = await this.userService.getUserById(id);

      if (!existingUser) {
        return res.status(404).json({
          message: "Usuario no encontrado",
        });
      }

      await this.userService.deleteUser(id);

      return res.status(200).json({
        message: "Usuario eliminado correctamente",
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error al eliminar el usuario",
      });
    }
  }
}
