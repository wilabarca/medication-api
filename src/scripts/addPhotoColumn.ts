import type { RowDataPacket } from "mysql2";
import { pool, closeConnection } from "../src/core/MySQL";

async function getColumns(table: string): Promise<string[]> {
  const [rows] = await pool.query<RowDataPacket[]>(`SHOW COLUMNS FROM ${table}`);
  return rows.map((row) => row.Field as string);
}

async function main(): Promise<void> {
  const columns = await getColumns("medications");

  if (!columns.includes("photo")) {
    await pool.query("ALTER TABLE medications ADD COLUMN photo MEDIUMTEXT NULL");
    console.log("✔ Columna photo agregada");
  } else {
    console.log("• La columna photo ya existía");
  }

  if (columns.includes("image_url")) {
    await pool.query("ALTER TABLE medications DROP COLUMN image_url");
    console.log("✔ Columna image_url eliminada");
  }

  console.log("Columnas actuales:", (await getColumns("medications")).join(", "));
}

main()
  .catch((error) => {
    console.error("✖ Error en la migración:", error);
    process.exitCode = 1;
  })
  .finally(() => closeConnection());
