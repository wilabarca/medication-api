import { Response } from "express";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

// Los IDs de MySQL son enteros: rechaza cualquier otra cosa antes de consultar
export function requireId(value: unknown, label = "identificador"): string {
  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) {
    throw new ValidationError(`El ${label} no es válido`);
  }
  return value.trim();
}

// Manejo centralizado: reemplaza el .includes("inválido") por tipos de error
export function sendError(res: Response, error: unknown, context: string): void {
  if (error instanceof ValidationError) {
    res.status(400).json({ message: error.message });
    return;
  }
  if (error instanceof NotFoundError) {
    res.status(404).json({ message: error.message });
    return;
  }
  console.error(`Error en ${context}:`, error);
  res.status(500).json({ message: "Error interno del servidor" });
}