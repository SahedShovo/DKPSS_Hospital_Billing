export type Role = 'ADMIN' | 'RECEPTIONIST';

export interface User {
  id: number;
  username: string;
  fullName: string;
  role: Role;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}