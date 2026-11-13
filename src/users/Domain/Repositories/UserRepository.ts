import { NewUser, User } from "../Entities/User";

export interface UserRepository {
  create(user: NewUser): Promise<User>;

  getById(id: string): Promise<User | null>;

  getByEmail(email: string): Promise<User | null>;
}