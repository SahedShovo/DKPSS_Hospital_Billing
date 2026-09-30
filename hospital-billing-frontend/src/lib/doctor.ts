import { api } from './api';
import { Doctor, CreateDoctorInput, UpdateDoctorInput } from '@/types/doctor.types';

export const doctorApi = {
  findAll: () => api.get<Doctor[]>('/doctors'),
  findPage: (page: number, pageSize = 10) => api.get<{ items: Doctor[]; total: number; page: number; pageSize: number }>(`/doctors/page?page=${page}&pageSize=${pageSize}`),
  findActive: () => api.get<Doctor[]>('/doctors/active'),
  create: (input: CreateDoctorInput) => api.post<Doctor>('/doctors', input),
  update: (id: number, input: UpdateDoctorInput) => api.patch<Doctor>(`/doctors/${id}`, input),
  remove: (id: number) => api.delete<Doctor>(`/doctors/${id}`),
};
