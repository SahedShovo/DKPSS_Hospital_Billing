import { api } from './api';
import { Admission, CreateAdmissionInput } from '@/types/admission.types';

export const admissionApi = {
  admit: (input: CreateAdmissionInput) => api.post<Admission>('/admissions', input),
  findOne: (id: number) => api.get<Admission>(`/admissions/${id}`),
  activeForPatient: (patientId: number) =>
    api.get<Admission | null>(`/admissions/patient/${patientId}/active`),
  refreshBedCharge: (id: number) => api.patch<{ netAmount: string; dueAmount: string }>(`/admissions/${id}/refresh-bed-charge`, {}),
  discharge: (id: number) => api.post<Admission>(`/admissions/${id}/discharge`, {}),
};