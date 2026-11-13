import mysql from "mysql2/promise";
import { NewUser, User } from "../../Domain/Entities/User";
import { UserRepository } from "../../Domain/Repositories/UserRepository";

type UserRow = {
  id: string | number;
  name: string;
  email: string;
  password_hash: string;
  created_at: Date;
};

export class MySQLUserRepository implements UserRepository {
  constructor(private db: mysql.Pool) {}

  private mapRow(row: UserRow): User {
    return {
      id: String(row.id),
      name: row.name,
      email: row.email,
      password: row.password_hash,
      created_at: row.created_at,
    };
  }

  async create(user: NewUser): Promise<User> {
    const [result] = await this.db.execute<mysql.ResultSetHeader>(
      `INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)`,
      [user.name, user.email, user.password]
    );

    const created = await this.getById(String(result.insertId));
    if (!created) {
      throw new Error("No se pudo recuperar el usuario creado");
    }
    return created;
  }

  async getById(id: string): Promise<User | null> {
    const [rows] = await this.db.execute<mysql.RowDataPacket[]>(
      `SELECT * FROM users WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows.length === 0 ? null : this.mapRow(rows[0] as UserRow);
  }

  async getByEmail(email: string): Promise<User | null> {
    const [rows] = await this.db.execute<mysql.RowDataPacket[]>(
      `SELECT * FROM users WHERE email = ? LIMIT 1`,
      [email]
    );
    return rows.length === 0 ? null : this.mapRow(rows[0] as UserRow);
  }
}