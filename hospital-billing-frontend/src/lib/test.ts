import { api } from './api';
import { LabTest, CreateTestInput, UpdateTestInput } from '@/types/test.types';

export const testApi = {
  findAll: () => api.get<LabTest[]>('/tests'),
  findPage: (page: number, pageSize = 10) => api.get<{ items: LabTest[]; total: number; page: number; pageSize: number }>(`/tests/page?page=${page}&pageSize=${pageSize}`),
  findActive: () => api.get<LabTest[]>('/tests/active'),
  create: (input: CreateTestInput) => api.post<LabTest>('/tests', input),
  update: (id: number, input: UpdateTestInput) => api.patch<LabTest>(`/tests/${id}`, input),
  remove: (id: number) => api.delete<LabTest>(`/tests/${id}`),
};
