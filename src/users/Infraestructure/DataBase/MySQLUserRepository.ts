
import mysql from "mysql2/promise";
import { User } from "../../Domain/Entities/User";
import { UserRepository } from "../../Domain/Repositories/UserRepository";

type UserRow = {
  id: string | number;
  name: string;
  email: string;
  password_hash: string;
  role: "PATIENT" | "CAREGIVER";
  is_active: number | boolean;
  created_at: Date;
  updated_at: Date;
};

export class MySQLUserRepository implements UserRepository {
  constructor(private db: mysql.Pool) {}

  // Convertir el registro de MySQL a la entidad User
  private mapRow(row: UserRow): User {
    return {
      id: String(row.id),
      name: row.name,
      email: row.email,
      password: row.password_hash,
      role: row.role,
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  // Crear paciente o cuidador
  async create(user: User): Promise<User> {
    const [result] = await this.db.execute<mysql.ResultSetHeader>(
      `INSERT INTO users
        (name, email, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [
        user.name,
        user.email,
        user.password,
        user.role,
        user.is_active,
      ]
    );

    return {
      ...user,
      id: String(result.insertId),
    };
  }

  // Obtener usuario por ID
  async getById(id: string): Promise<User | null> {
    const [rows] = await this.db.execute<mysql.RowDataPacket[]>(
      `SELECT * FROM users WHERE id = ? LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRow(rows[0] as UserRow);
  }

  // Buscar usuario por correo para el login
  async getByEmail(email: string): Promise<User | null> {
    const [rows] = await this.db.execute<mysql.RowDataPacket[]>(
      `SELECT * FROM users WHERE email = ? LIMIT 1`,
      [email]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRow(rows[0] as UserRow);
  }

  // Obtener todos los usuarios
  async getAll(): Promise<User[]> {
    const [rows] = await this.db.execute<mysql.RowDataPacket[]>(
      `SELECT * FROM users ORDER BY created_at DESC`
    );

    return rows.map((row) => this.mapRow(row as UserRow));
  }

  // Actualizar datos del usuario
  async update(user: User): Promise<User> {
    await this.db.execute(
      `UPDATE users
       SET name = ?, email = ?, password_hash = ?,
           role = ?, is_active = ?
       WHERE id = ?`,
      [
        user.name,
        user.email,
        user.password,
        user.role,
        user.is_active,
        user.id,
      ]
    );

    return user;
  }

  // Eliminar usuario
  async delete(id: string): Promise<void> {
    await this.db.execute(
      `DELETE FROM users WHERE id = ?`,
      [id]
    );
  }
}
