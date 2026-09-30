import { api } from './api';
import { AppUser, CreateUserInput } from '@/types/user.types';

export const userApi = {
  findAll: () => api.get<AppUser[]>('/users'),
  findPage: (page: number, pageSize = 10) => api.get<{ items: AppUser[]; total: number; page: number; pageSize: number }>(`/users/page?page=${page}&pageSize=${pageSize}`),
  create: (input: CreateUserInput) => api.post<AppUser>('/users', input),
  update: (id: number, input: { fullName?: string; role?: UserRole; isActive?: boolean }) =>
    api.patch<AppUser>(`/users/${id}`, input),
  deactivate: (id: number) => api.delete<AppUser>(`/users/${id}`),
};

type UserRole = 'ADMIN' | 'RECEPTIONIST';
