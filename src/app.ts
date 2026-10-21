import express from "express";
import cors from "cors";

import { RegisterUserRoutes } from "./users/Infraestructure/Routers/UserRoutes";
import { RegisterMedicationRoutes } from "./medication/Infraestructure/Routers/MedicationRoutes";

import { UserController } from "./users/Infraestructure/Controllers/UserController";
import { UserService } from "./users/Application/UserService";
import { MySQLUserRepository } from "./users/Infraestructure/DataBase/MySQLUserRepository";

import { MedicationController } from "./medication/Infraestructure/Controllers/MedicationController";
import { MedicationService } from "./medication/Application/MedicationService";
import { MySQLMedicationRepository } from "./medication/Infraestructure/DataBase/MySQLMedicationRepository";

import { initDB, pool } from "./core/MySQL";

const app = express();

app.use(cors());
app.use(express.json());

// Verificar que la API está funcionando.
app.get("/test", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "API Medication funcionando correctamente",
    timestamp: new Date().toISOString(),
  });
});

// Verificar el estado de la API y MySQL.
app.get("/health", async (_req, res) => {
  let connection;

  try {
    connection = await pool.getConnection();

    await connection.execute("SELECT 1");

    res.status(200).json({
      success: true,
      api: "connected",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      api: "connected",
      database: "disconnected",
      error:
        error instanceof Error
          ? error.message
          : "Error desconocido al conectar con MySQL",
      timestamp: new Date().toISOString(),
    });
  } finally {
    connection?.release();
  }
});

let isInitialized = false;

// Inicializar la base de datos y registrar las rutas.
export async function initializeRoutes(): Promise<void> {
  if (isInitialized) {
    console.log("Las rutas ya están inicializadas");
    return;
  }

  console.log("Inicializando API Medication...");

  // Comprobar conexión y crear las tablas.
  await initDB();

  console.log("Conexión con MySQL establecida");

  // Módulo de usuarios.
  const userRepository = new MySQLUserRepository(pool);
  const userService = new UserService(userRepository);
  const userController = new UserController(userService);

  // Módulo de medicamentos.
  const medicationRepository = new MySQLMedicationRepository(pool);
  const medicationService = new MedicationService(
    medicationRepository
  );
  const medicationController = new MedicationController(
    medicationService
  );

  // Registrar las rutas de los módulos.
  RegisterUserRoutes(app, userController);
  RegisterMedicationRoutes(app, medicationController);

  // Ruta principal.
  app.get("/", (_req, res) => {
    res.status(200).json({
      success: true,
      message: "API Medication",
      version: "1.0.0",
      modules: ["User", "Medication"],
      timestamp: new Date().toISOString(),
    });
  });

  isInitialized = true;

  console.log("Rutas inicializadas correctamente");
}

export default app;
