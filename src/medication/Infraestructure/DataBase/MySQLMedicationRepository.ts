import mysql from "mysql2/promise";
import {
  Medication,
  MedicationData,
  MedicationSchedule,
  ScheduleData,
} from "../../Domain/Entities/Medication";
import { MedicationRepository } from "../../Domain/Repositories/MedicationRepository";

type MedicationRow = {
  id: string | number;
  patient_id: string | number;
  name: string;
  description: string | null;
  dosage: string;
  instructions: string | null;
  image_url: string | null;
  start_date: Date | string;
  end_date: Date | string | null;
  created_at: Date;
};

type ScheduleRow = {
  id: string | number;
  medication_id: string | number;
  reminder_time: string;
  days_of_week: number[] | string | null;
  is_active: number | boolean;
};

function toDateString(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${value.getFullYear()}-${m}-${d}`;
}

export class MySQLMedicationRepository implements MedicationRepository {
  constructor(private db: mysql.Pool) {}

  private mapSchedule(row: ScheduleRow): MedicationSchedule {
    let days: number[] = [];
    if (Array.isArray(row.days_of_week)) days = row.days_of_week;
    else if (typeof row.days_of_week === "string") days = JSON.parse(row.days_of_week);

    return {
      id: String(row.id),
      medicationId: String(row.medication_id),
      time: String(row.reminder_time).slice(0, 5), // "HH:mm:ss" -> "HH:mm"
      daysOfWeek: days,
      enabled: Boolean(row.is_active),
    };
  }

  // Una sola consulta para los horarios de todos los medicamentos (evita N+1)
  private async attachSchedules(rows: MedicationRow[]): Promise<Medication[]> {
    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const placeholders = ids.map(() => "?").join(",");
    const [scheduleRows] = await this.db.execute<mysql.RowDataPacket[]>(
      `SELECT * FROM medication_schedules
       WHERE medication_id IN (${placeholders})
       ORDER BY reminder_time ASC`,
      ids
    );

    const byMedication = new Map<string, MedicationSchedule[]>();
    for (const row of scheduleRows as ScheduleRow[]) {
      const schedule = this.mapSchedule(row);
      const list = byMedication.get(schedule.medicationId) ?? [];
      list.push(schedule);
      byMedication.set(schedule.medicationId, list);
    }

    return rows.map((row) => ({
      id: String(row.id),
      patientId: String(row.patient_id),
      name: row.name,
      description: row.description,
      dosage: row.dosage,
      instructions: row.instructions,
      imageUrl: row.image_url,
      startDate: toDateString(row.start_date),
      endDate: row.end_date ? toDateString(row.end_date) : null,
      schedules: byMedication.get(String(row.id)) ?? [],
      createdAt: row.created_at,
    }));
  }

  private async findById(id: string): Promise<Medication | null> {
    const [rows] = await this.db.execute<mysql.RowDataPacket[]>(
      `SELECT * FROM medications WHERE id = ? LIMIT 1`,
      [id]
    );
    return (await this.attachSchedules(rows as MedicationRow[]))[0] ?? null;
  }

  private async insertSchedules(
    connection: mysql.PoolConnection,
    medicationId: string | number,
    schedules: ScheduleData[]
  ): Promise<void> {
    for (const schedule of schedules) {
      await connection.execute(
        `INSERT INTO medication_schedules (medication_id, reminder_time, days_of_week, is_active)
         VALUES (?, ?, ?, ?)`,
        [medicationId, schedule.time, JSON.stringify(schedule.daysOfWeek), schedule.enabled]
      );
    }
  }

  async create(data: MedicationData): Promise<Medication> {
    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.execute<mysql.ResultSetHeader>(
        `INSERT INTO medications
          (patient_id, name, description, dosage, instructions, image_url, start_date, end_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.patientId, data.name, data.description, data.dosage,
          data.instructions, data.imageUrl, data.startDate, data.endDate,
        ]
      );

      await this.insertSchedules(connection, result.insertId, data.schedules);
      await connection.commit();

      const created = await this.findById(String(result.insertId));
      if (!created) throw new Error("No se pudo recuperar el medicamento creado");
      return created;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getOwned(id: string, caregiverId: string): Promise<Medication | null> {
    const [rows] = await this.db.execute<mysql.RowDataPacket[]>(
      `SELECT m.* FROM medications m
       JOIN patients p ON p.id = m.patient_id
       WHERE m.id = ? AND p.caregiver_id = ? LIMIT 1`,
      [id, caregiverId]
    );
    return (await this.attachSchedules(rows as MedicationRow[]))[0] ?? null;
  }

  async getByPatientId(patientId: string): Promise<Medication[]> {
    const [rows] = await this.db.execute<mysql.RowDataPacket[]>(
      `SELECT * FROM medications WHERE patient_id = ? ORDER BY created_at DESC`,
      [patientId]
    );
    return this.attachSchedules(rows as MedicationRow[]);
  }

  async update(id: string, data: Omit<MedicationData, "patientId">): Promise<Medication> {
    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      await connection.execute(
        `UPDATE medications
         SET name = ?, description = ?, dosage = ?, instructions = ?,
             image_url = ?, start_date = ?, end_date = ?
         WHERE id = ?`,
        [
          data.name, data.description, data.dosage, data.instructions,
          data.imageUrl, data.startDate, data.endDate, id,
        ]
      );

      // Se reemplazan los horarios por los recibidos
      await connection.execute(`DELETE FROM medication_schedules WHERE medication_id = ?`, [id]);
      await this.insertSchedules(connection, id, data.schedules);

      await connection.commit();

      const updated = await this.findById(id);
      if (!updated) throw new Error("No se pudo recuperar el medicamento actualizado");
      return updated;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Los horarios se borran solos (ON DELETE CASCADE)
  async delete(id: string): Promise<void> {
    await this.db.execute(`DELETE FROM medications WHERE id = ?`, [id]);
  }

  async patientBelongsTo(patientId: string, caregiverId: string): Promise<boolean> {
    const [rows] = await this.db.execute<mysql.RowDataPacket[]>(
      `SELECT 1 FROM patients WHERE id = ? AND caregiver_id = ? LIMIT 1`,
      [patientId, caregiverId]
    );
    return rows.length > 0;
  }
}