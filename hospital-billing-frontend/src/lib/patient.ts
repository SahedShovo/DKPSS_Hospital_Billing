import { api } from './api';
import { Patient, CreatePatientInput } from '@/types/patient.types';

export const patientApi = {
  create: (input: CreatePatientInput) => api.post<Patient>('/patients', input),
  findAll: () => api.get<Patient[]>('/patients'),
  findPage: (page: number, pageSize = 10) =>
    api.get<{ items: Patient[]; total: number; page: number; pageSize: number }>(
      `/patients/page?page=${page}&pageSize=${pageSize}`,
    ),
  findOne: (id: number) => api.get<Patient>(`/patients/${id}`),
  search: (query: { name?: string; phone?: string; patientCode?: string }) => {
    const params = new URLSearchParams();
    if (query.name) params.set('name', query.name);
    if (query.phone) params.set('phone', query.phone);
    if (query.patientCode) params.set('patientCode', query.patientCode);
    return api.get<Patient[]>(`/patients/search?${params.toString()}`);
  },
  update: (id: number, input: Partial<CreatePatientInput>) =>
    api.patch<Patient>(`/patients/${id}`, input),
  remove: (id: number) => api.delete<Patient>(`/patients/${id}`),
};
