import "dotenv/config";
import { initDB, pool } from "../core/MySQL";

// Orden inverso a las llaves foráneas
const TABLES = [
  "patient_devices",
  "medication_schedules",
  "medications",
  "patients",
  "users",
];

async function main() {
  const conn = await pool.getConnection();
  try {
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const table of TABLES) {
      await conn.query(`DROP TABLE IF EXISTS \`${table}\``);
      console.log(`Tabla eliminada: ${table}`);
    }
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");
  } finally {
    conn.release();
  }

  // Vuelve a crear todo con el SCHEMA actual
  await initDB();

  const [cols] = await pool.query("SHOW COLUMNS FROM users");
  console.log("Columnas de users:", (cols as { Field: string }[]).map((c) => c.Field).join(", "));

  console.log("Base de datos recreada con el esquema actual");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});