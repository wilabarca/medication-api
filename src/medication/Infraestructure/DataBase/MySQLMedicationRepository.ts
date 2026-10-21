
import mysql from "mysql2/promise";
import { Medication, MedicationSchedule } from "../../Domain/Entities/Medication";
import { MedicationRepository } from "../../Domain/Repositories/MedicationRepository";

type MedicationRow = {
  id: string | number;
  patient_id: string | number;
  caregiver_id: string | number;
  name: string;
  dosage: string;
  instructions: string | null;
  start_date: Date | string;
  end_date: Date | string | null;
  active: number | boolean;
  created_at: Date;
  updated_at: Date;
};

type MedicationScheduleRow = {
  id: string | number;
  medication_id: string | number;
  time: string;
  days_of_week: number[] | string;
  enabled: number | boolean;
  created_at: Date;
  updated_at: Date;
};

export class MySQLMedicationRepository implements MedicationRepository {
  constructor(private db: mysql.Pool) {}

  // Convertir un registro de MySQL a MedicationSchedule
  private mapScheduleRow(row: MedicationScheduleRow): MedicationSchedule {
    let daysOfWeek: number[];

    if (Array.isArray(row.days_of_week)) {
      daysOfWeek = row.days_of_week;
    } else {
      daysOfWeek = JSON.parse(row.days_of_week) as number[];
    }

    return {
      id: String(row.id),
      medicationId: String(row.medication_id),
      time: row.time,
      daysOfWeek,
      enabled: Boolean(row.enabled),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Obtener horarios de un medicamento
  private async getSchedulesByMedicationId(
    medicationId: string
  ): Promise<MedicationSchedule[]> {
    const [rows] = await this.db.execute<mysql.RowDataPacket[]>(
      `SELECT *
       FROM medication_schedules
       WHERE medication_id = ?
       ORDER BY time ASC`,
      [medicationId]
    );

    return rows.map((row) =>
      this.mapScheduleRow(row as MedicationScheduleRow)
    );
  }

  // Convertir un registro de MySQL a Medication
  private async mapMedicationRow(
    row: MedicationRow
  ): Promise<Medication> {
    const id = String(row.id);

    const schedules = await this.getSchedulesByMedicationId(id);

    return {
      id,
      patientId: String(row.patient_id),
      caregiverId: String(row.caregiver_id),
      name: row.name,
      dosage: row.dosage,
      instructions: row.instructions,
      startDate: new Date(row.start_date),
      endDate: row.end_date ? new Date(row.end_date) : null,
      active: Boolean(row.active),
      schedules,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Crear medicamento y sus horarios
  async create(medication: Medication): Promise<Medication> {
    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.execute<mysql.ResultSetHeader>(
        `INSERT INTO medications
          (patient_id, caregiver_id, name, dosage, instructions,
           start_date, end_date, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          medication.patientId,
          medication.caregiverId,
          medication.name,
          medication.dosage,
          medication.instructions,
          medication.startDate,
          medication.endDate,
          medication.active,
        ]
      );

      const medicationId = String(result.insertId);

      for (const schedule of medication.schedules) {
        await connection.execute(
          `INSERT INTO medication_schedules
            (medication_id, time, days_of_week, enabled)
           VALUES (?, ?, ?, ?)`,
          [
            medicationId,
            schedule.time,
            JSON.stringify(schedule.daysOfWeek),
            schedule.enabled,
          ]
        );
      }

      await connection.commit();

      const created = await this.getById(medicationId);

      if (!created) {
        throw new Error("No se pudo recuperar el medicamento creado");
      }

      return created;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Obtener medicamento por ID
  async getById(id: string): Promise<Medication | null> {
    const [rows] = await this.db.execute<mysql.RowDataPacket[]>(
      `SELECT *
       FROM medications
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapMedicationRow(rows[0] as MedicationRow);
  }

  // Obtener medicamentos de un paciente
  async getByPatientId(patientId: string): Promise<Medication[]> {
    const [rows] = await this.db.execute<mysql.RowDataPacket[]>(
      `SELECT *
       FROM medications
       WHERE patient_id = ?
       ORDER BY created_at DESC`,
      [patientId]
    );

    return Promise.all(
      rows.map((row) => this.mapMedicationRow(row as MedicationRow))
    );
  }

  // Obtener medicamentos registrados por un cuidador
  async getByCaregiverId(caregiverId: string): Promise<Medication[]> {
    const [rows] = await this.db.execute<mysql.RowDataPacket[]>(
      `SELECT *
       FROM medications
       WHERE caregiver_id = ?
       ORDER BY created_at DESC`,
      [caregiverId]
    );

    return Promise.all(
      rows.map((row) => this.mapMedicationRow(row as MedicationRow))
    );
  }

  // Obtener todos los medicamentos
  async getAll(): Promise<Medication[]> {
    const [rows] = await this.db.execute<mysql.RowDataPacket[]>(
      `SELECT *
       FROM medications
       ORDER BY created_at DESC`
    );

    return Promise.all(
      rows.map((row) => this.mapMedicationRow(row as MedicationRow))
    );
  }

  // Actualizar medicamento y sus horarios
  async update(medication: Medication): Promise<Medication> {
    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      await connection.execute(
        `UPDATE medications
         SET patient_id = ?, caregiver_id = ?, name = ?, dosage = ?,
             instructions = ?, start_date = ?, end_date = ?, active = ?
         WHERE id = ?`,
        [
          medication.patientId,
          medication.caregiverId,
          medication.name,
          medication.dosage,
          medication.instructions,
          medication.startDate,
          medication.endDate,
          medication.active,
          medication.id,
        ]
      );

      // Reemplazar los horarios existentes por los recibidos
      await connection.execute(
        `DELETE FROM medication_schedules
         WHERE medication_id = ?`,
        [medication.id]
      );

      for (const schedule of medication.schedules) {
        await connection.execute(
          `INSERT INTO medication_schedules
            (medication_id, time, days_of_week, enabled)
           VALUES (?, ?, ?, ?)`,
          [
            medication.id,
            schedule.time,
            JSON.stringify(schedule.daysOfWeek),
            schedule.enabled,
          ]
        );
      }

      await connection.commit();

      const updated = await this.getById(medication.id);

      if (!updated) {
        throw new Error("No se pudo recuperar el medicamento actualizado");
      }

      return updated;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Eliminar medicamento y sus horarios
  async delete(id: string): Promise<void> {
    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      await connection.execute(
        `DELETE FROM medication_schedules
         WHERE medication_id = ?`,
        [id]
      );

      await connection.execute(
        `DELETE FROM medications
         WHERE id = ?`,
        [id]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
