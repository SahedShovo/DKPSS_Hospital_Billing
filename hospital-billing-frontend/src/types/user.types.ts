export type UserRole = 'ADMIN' | 'RECEPTIONIST';

export interface AppUser {
  id: number;
  username: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserInput {
  username: string;
  password: string;
  fullName: string;
  role: UserRole;
}