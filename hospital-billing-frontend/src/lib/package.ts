import { api } from './api';
import { Package, CreatePackageInput } from '@/types/package.types';

export const packageApi = {
  findAll: () => api.get<Package[]>('/packages'),
  findPage: (page: number, pageSize = 10) => api.get<{ items: Package[]; total: number; page: number; pageSize: number }>(`/packages/page?page=${page}&pageSize=${pageSize}`),
  findActive: () => api.get<Package[]>('/packages/active'),
  findOne: (id: number) => api.get<Package>(`/packages/${id}`),
  create: (input: CreatePackageInput) => api.post<Package>('/packages', input),
  update: (id: number, input: { name?: string; packagePrice?: string | null; isActive?: boolean }) =>
    api.patch<Package>(`/packages/${id}`, input),
  remove: (id: number) => api.delete<Package>(`/packages/${id}`),
};
