// Cuenta de acceso del CUIDADOR. El paciente es una entidad aparte (Patient).
export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // hash bcrypt
  created_at: Date;
}

export type NewUser = Pick<User, "name" | "email" | "password">;