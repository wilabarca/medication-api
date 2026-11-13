import mysql from "mysql2/promise";
import { Patient, PatientData } from "../../Domain/Entities/Patient";
import { PatientRepository } from "../../Domain/Repositories/Patientrepository";

type PatientRow = {
  id: string | number;
  caregiver_id: string | number;
  name: string;
  age: number | null;
  gender: string | null;
  linked_devices: number | string;
  created_at: Date;
};

// Base común: incluye cuántos teléfonos están vinculados al paciente
const SELECT_PATIENT = `
  SELECT p.id, p.caregiver_id, p.name, p.age, p.gender, p.created_at,
         (SELECT COUNT(*) FROM patient_devices d WHERE d.patient_id = p.id) AS linked_devices
  FROM patients p`;

export class MySQLPatientRepository implements PatientRepository {
  constructor(private db: mysql.Pool) {}

  private mapRow(row: PatientRow): Patient {
    return {
      id: String(row.id),
      caregiverId: String(row.caregiver_id),
      name: row.name,
      age: row.age,
      gender: row.gender,
      linkedDevices: Number(row.linked_devices),
      createdAt: row.created_at,
    };
  }

  async create(caregiverId: string, data: PatientData): Promise<Patient> {
    const [result] = await this.db.execute<mysql.ResultSetHeader>(
      `INSERT INTO patients (caregiver_id, name, age, gender) VALUES (?, ?, ?, ?)`,
      [caregiverId, data.name, data.age, data.gender]
    );
    const created = await this.getOwned(String(result.insertId), caregiverId);
    if (!created) throw new Error("No se pudo recuperar el paciente creado");
    return created;
  }

  async getOwned(id: string, caregiverId: string): Promise<Patient | null> {
    const [rows] = await this.db.execute<mysql.RowDataPacket[]>(
      `${SELECT_PATIENT} WHERE p.id = ? AND p.caregiver_id = ? LIMIT 1`,
      [id, caregiverId]
    );
    return rows.length === 0 ? null : this.mapRow(rows[0] as PatientRow);
  }

  async listByCaregiver(caregiverId: string): Promise<Patient[]> {
    const [rows] = await this.db.execute<mysql.RowDataPacket[]>(
      `${SELECT_PATIENT} WHERE p.caregiver_id = ? ORDER BY p.name`,
      [caregiverId]
    );
    return rows.map((r) => this.mapRow(r as PatientRow));
  }

  async update(id: string, caregiverId: string, data: Partial<PatientData>): Promise<Patient | null> {
    await this.db.execute(
      `UPDATE patients
       SET name = COALESCE(?, name), age = COALESCE(?, age), gender = COALESCE(?, gender)
       WHERE id = ? AND caregiver_id = ?`,
      [data.name ?? null, data.age ?? null, data.gender ?? null, id, caregiverId]
    );
    return this.getOwned(id, caregiverId);
  }

  async delete(id: string, caregiverId: string): Promise<boolean> {
    const [result] = await this.db.execute<mysql.ResultSetHeader>(
      `DELETE FROM patients WHERE id = ? AND caregiver_id = ?`,
      [id, caregiverId]
    );
    return result.affectedRows > 0;
  }

  async setLinkCode(id: string, caregiverId: string, code: string, expiresAt: Date): Promise<boolean> {
    const [result] = await this.db.execute<mysql.ResultSetHeader>(
      `UPDATE patients SET link_code = ?, link_code_expires_at = ?
       WHERE id = ? AND caregiver_id = ?`,
      [code, expiresAt, id, caregiverId]
    );
    return result.affectedRows > 0;
  }

  async findByValidLinkCode(code: string): Promise<Patient | null> {
    const [rows] = await this.db.execute<mysql.RowDataPacket[]>(
      `${SELECT_PATIENT} WHERE p.link_code = ? AND p.link_code_expires_at > NOW() LIMIT 1`,
      [code]
    );
    return rows.length === 0 ? null : this.mapRow(rows[0] as PatientRow);
  }

  // Un solo uso y atómico: si dos teléfonos lo intentan, solo uno obtiene true
  async consumeLinkCode(id: string, code: string): Promise<boolean> {
    const [result] = await this.db.execute<mysql.ResultSetHeader>(
      `UPDATE patients SET link_code = NULL, link_code_expires_at = NULL
       WHERE id = ? AND link_code = ? AND link_code_expires_at > NOW()`,
      [id, code]
    );
    return result.affectedRows === 1;
  }

  async upsertDevice(patientId: string, deviceId: string, tokenHash: string): Promise<void> {
    await this.db.execute(
      `INSERT INTO patient_devices (patient_id, device_id, token_hash) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE token_hash = VALUES(token_hash), linked_at = NOW()`,
      [patientId, deviceId, tokenHash]
    );
  }

  async findPatientIdByTokenHash(tokenHash: string): Promise<string | null> {
    const [rows] = await this.db.execute<mysql.RowDataPacket[]>(
      `SELECT patient_id FROM patient_devices WHERE token_hash = ? LIMIT 1`,
      [tokenHash]
    );
    return rows.length === 0 ? null : String(rows[0].patient_id);
  }
}