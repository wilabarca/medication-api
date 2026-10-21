
import mysql, { Pool, PoolConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config();

// Configuración SSL segura para Aiven.
function getSSLConfig() {
  if (process.env.DB_SSL !== 'true') {
    return undefined;
  }

  const caPath = path.resolve(
    process.env.DB_SSL_CA_PATH || 'certs/ca.pem'
  );

  if (!fs.existsSync(caPath)) {
    throw new Error(
      `No se encontró el certificado CA de MySQL: ${caPath}. ` +
      'Descarga el certificado de Aiven y configura DB_SSL_CA_PATH.'
    );
  }

  return {
    ca: fs.readFileSync(caPath, 'utf8'),
    rejectUnauthorized: true
  };
}

// Pool de conexiones MySQL.
export const pool: Pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT ?? 3306),
  connectTimeout: 10000,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  ssl: getSSLConfig()
});

// Obtener una conexión individual del pool.
export async function getConnection(): Promise<PoolConnection> {
  return pool.getConnection();
}

// Cerrar todas las conexiones.
export async function closeConnection(): Promise<void> {
  await pool.end();
  console.log('✅ Pool de MySQL cerrado');
}

// Crear las tablas necesarias para Medication.
async function createTables(): Promise<void> {
  // Usuarios: pacientes y cuidadores.
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('patient', 'caregiver') NOT NULL DEFAULT 'patient',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_unicode_ci
  `);

  // Medicamentos asociados a un usuario.
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS medications (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      name VARCHAR(150) NOT NULL,
      dosage VARCHAR(100) NOT NULL,
      frequency VARCHAR(100) NOT NULL,
      instructions TEXT NULL,
      start_date DATE NULL,
      end_date DATE NULL,
      reminder_time TIME NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

      INDEX idx_medications_user_id (user_id),

      CONSTRAINT fk_medications_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
    ) ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_unicode_ci
  `);

  console.log('✅ Tablas users y medications verificadas/creadas');
}

// Verificar conexión e inicializar tablas.
export async function initDB(): Promise<void> {
  try {
    await pool.query('SELECT 1');

    console.log('✅ Conexión con MySQL establecida');

    await createTables();

    console.log('✅ Base de datos de Medication inicializada');
  } catch (error) {
    console.error('❌ Error inicializando MySQL:', error);
    throw error;
  }
}
