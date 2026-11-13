import mysql, { Pool, PoolConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { SCHEMA } from './Schema';

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
  // Las columnas DATE llegan como 'YYYY-MM-DD' (evita desfases de zona horaria)
  dateStrings: ['DATE'],
  ssl: getSSLConfig()
});

// Obtener una conexión individual del pool.
export async function getConnection(): Promise<PoolConnection> {
  return pool.getConnection();
}

// Cerrar todas las conexiones.
export async function closeConnection(): Promise<void> {
  await pool.end();
  console.log('Pool de MySQL cerrado');
}

// Crear las tablas que falten (idempotente, en orden de FKs).
async function createTables(): Promise<void> {
  for (const table of SCHEMA) {
    await pool.query(table.sql);
    console.log(`Tabla verificada: ${table.name}`);
  }
}

// Verificar conexión e inicializar tablas.
export async function initDB(): Promise<void> {
  try {
    await pool.query('SELECT 1');
    console.log('Conexión con MySQL establecida');

    await createTables();

    console.log('Base de datos de Medication inicializada');
  } catch (error) {
    console.error('Error inicializando MySQL:', error);
    throw error;
  }
}