// Modelo: el cuidador tiene cuenta; el paciente es un perfil vinculado por código/QR.
// Orden de dependencia por FKs. Todas las sentencias son idempotentes.
export const SCHEMA: { name: string; sql: string }[] = [
  {
    name: 'users',
    sql: `
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  },
  {
    name: 'patients',
    sql: `
CREATE TABLE IF NOT EXISTS patients (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  caregiver_id INT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  age TINYINT UNSIGNED NULL,
  gender VARCHAR(20) NULL,
  link_code CHAR(6) NULL UNIQUE,
  link_code_expires_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_patient_caregiver FOREIGN KEY (caregiver_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_patient_caregiver (caregiver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  },
  {
    name: 'medications',
    sql: `
CREATE TABLE IF NOT EXISTS medications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_id INT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  dosage VARCHAR(100) NOT NULL,
  instructions TEXT NULL,
  image_url VARCHAR(500) NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_med_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  INDEX idx_med_patient (patient_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  },
  {
    name: 'medication_schedules',
    sql: `
CREATE TABLE IF NOT EXISTS medication_schedules (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  medication_id INT UNSIGNED NOT NULL,
  reminder_time TIME NOT NULL,
  days_of_week JSON NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_ms_medication FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE CASCADE,
  INDEX idx_ms_medication (medication_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  },
  {
    name: 'patient_devices',
    sql: `
CREATE TABLE IF NOT EXISTS patient_devices (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_id INT UNSIGNED NOT NULL,
  device_id VARCHAR(190) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  linked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pd_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT uq_pd_patient_device UNIQUE (patient_id, device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  }
];