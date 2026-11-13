import crypto from "crypto";
import { Patient, PatientData } from "../Domain/Entities/Patient";
import { PatientRepository } from "../Domain/Repositories/Patientrepository";
import { NotFoundError, ValidationError, requireId } from "../../core/Errors";

// Sin 0/O/1/I para que el código sea fácil de leer y teclear
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
const CODE_TTL_MINUTES = 10;

const sha256 = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");

function randomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return code;
}

export class PatientService {
  constructor(private repository: PatientRepository) {}

  // ---------- CRUD (cuidador) ----------
  async create(caregiverId: string, body: any): Promise<Patient> {
    const parsed = this.parse(body, true);
    return this.repository.create(caregiverId, {
      name: parsed.name!,
      age: parsed.age ?? null,
      gender: parsed.gender ?? null,
    });
  }

  async list(caregiverId: string): Promise<Patient[]> {
    return this.repository.listByCaregiver(caregiverId);
  }

  async getById(id: string, caregiverId: string): Promise<Patient> {
    const patient = await this.repository.getOwned(requireId(id, "ID del paciente"), caregiverId);
    if (!patient) throw new NotFoundError("Paciente no encontrado");
    return patient;
  }

  async update(id: string, caregiverId: string, body: any): Promise<Patient> {
    const patientId = requireId(id, "ID del paciente");
    const parsed = this.parse(body, false);
    if (Object.keys(parsed).length === 0) {
      throw new ValidationError("Debes proporcionar al menos un campo para actualizar");
    }
    const updated = await this.repository.update(patientId, caregiverId, parsed);
    if (!updated) throw new NotFoundError("Paciente no encontrado");
    return updated;
  }

  async delete(id: string, caregiverId: string): Promise<void> {
    const deleted = await this.repository.delete(requireId(id, "ID del paciente"), caregiverId);
    if (!deleted) throw new NotFoundError("Paciente no encontrado");
  }

  // ---------- Vinculación por código / QR ----------
  // Cuidador: genera (o regenera) el código que Android convierte en QR
  async generateLinkCode(id: string, caregiverId: string) {
    const patientId = requireId(id, "ID del paciente");
    if (!(await this.repository.getOwned(patientId, caregiverId))) {
      throw new NotFoundError("Paciente no encontrado");
    }

    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000);

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const code = randomCode();
        await this.repository.setLinkCode(patientId, caregiverId, code, expiresAt);
        return { code, expiresAt };
      } catch (error: any) {
        if (error?.code !== "ER_DUP_ENTRY") throw error; // colisión del UNIQUE: reintenta
      }
    }
    throw new Error("No se pudo generar un código único");
  }

  // Teléfono del paciente: canjea el código y recibe un token de dispositivo.
  // Devuelve null (mismo mensaje) si el código no existe, expiró o ya se usó.
  async linkDevice(code: unknown, deviceId: unknown) {
    if (typeof deviceId !== "string" || !deviceId.trim() || deviceId.length > 190) {
      throw new ValidationError("El identificador del dispositivo es obligatorio");
    }
    if (typeof code !== "string") return null;

    const normalized = code.trim().toUpperCase();
    if (!CODE_RE.test(normalized)) return null;

    const patient = await this.repository.findByValidLinkCode(normalized);
    if (!patient) return null;
    if (!(await this.repository.consumeLinkCode(patient.id, normalized))) return null;

    const deviceToken = crypto.randomBytes(32).toString("hex");
    await this.repository.upsertDevice(patient.id, deviceId.trim(), sha256(deviceToken));

    return { patientId: patient.id, patientName: patient.name, deviceToken };
  }

  // Middleware del dispositivo: devuelve el patientId o null
  async authenticateDevice(deviceToken: string): Promise<string | null> {
    return this.repository.findPatientIdByTokenHash(sha256(deviceToken));
  }

  // ---------- validación ----------
  private parse(body: any, requireName: boolean): Partial<PatientData> {
    const out: Partial<PatientData> = {};

    if (body?.name !== undefined || requireName) {
      if (typeof body?.name !== "string" || !body.name.trim() || body.name.trim().length > 120) {
        throw new ValidationError("El nombre del paciente es obligatorio (máx. 120 caracteres)");
      }
      out.name = body.name.trim();
    }

    if (body?.age !== undefined && body.age !== null) {
      if (!Number.isInteger(body.age) || body.age < 0 || body.age > 120) {
        throw new ValidationError("La edad debe ser un entero entre 0 y 120");
      }
      out.age = body.age;
    }

    if (body?.gender !== undefined && body.gender !== null) {
      if (typeof body.gender !== "string" || body.gender.trim().length > 20) {
        throw new ValidationError("El sexo no es válido (máx. 20 caracteres)");
      }
      out.gender = body.gender.trim() || null;
    }

    return out;
  }
}