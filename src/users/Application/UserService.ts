import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UserRepository } from "../Domain/Repositories/UserRepository";
import { NewUser, User } from "../Domain/Entities/User";

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super("El correo electrónico ya está registrado");
    this.name = "EmailAlreadyRegisteredError";
  }
}

export class UserService {
  constructor(private repository: UserRepository) {}

  async createUser(data: NewUser): Promise<User> {
    const email = data.email.trim().toLowerCase();

    if (await this.repository.getByEmail(email)) {
      throw new EmailAlreadyRegisteredError();
    }

    const password = await bcrypt.hash(data.password, 10);

    try {
      return await this.repository.create({
        name: data.name.trim(),
        email,
        password,
      });
    } catch (error: any) {
      // Dos registros simultáneos: el UNIQUE de MySQL es la última defensa
      if (error?.code === "ER_DUP_ENTRY") {
        throw new EmailAlreadyRegisteredError();
      }
      throw error;
    }
  }

  async login(
    email: string,
    password: string
  ): Promise<{ token: string; user: User } | null> {
    const user = await this.repository.getByEmail(email.trim().toLowerCase());
    if (!user) return null;

    if (!(await bcrypt.compare(password, user.password))) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET no está configurado");
    }

    const token = jwt.sign({ id: user.id, email: user.email }, secret, {
      expiresIn: (process.env.JWT_EXPIRES_IN ??
        "7d") as jwt.SignOptions["expiresIn"],
    });

    return { token, user };
  }

  async getUserById(id: string): Promise<User | null> {
    return this.repository.getById(id);
  }
}