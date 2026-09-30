import { api } from './api';
import { Bill } from '@/types/bill.types';

export interface CreateDoctorVisitItemInput {
  doctorId: number;
  visitType: 'CONSULTANT' | 'DUTY_DOCTOR' | 'SURGEON';
  unitPrice: string;
  quantity?: number;
  itemDiscountPercent?: string;
}

export interface CreateDoctorVisitBillInput {
  patientId: number;
  discountMode?: 'NONE' | 'BILL' | 'ITEM';
  discountPercent?: string;
  items: CreateDoctorVisitItemInput[];
}

export interface CreateDiagnosticItemInput {
  testId: number;
  quantity?: number;
  itemDiscountPercent?: string;
}

export interface CreateDiagnosticBillInput {
  patientId: number;
  discountMode?: 'NONE' | 'BILL' | 'ITEM';
  discountPercent?: string;
  items: CreateDiagnosticItemInput[];
}

export interface CreatePackageBillInput {
  patientId: number;
  packageId: number;
}

export const billApi = {
  findAll: () => api.get<Bill[]>('/bills'),
  findPage: (page: number, pageSize = 10, type?: string, status?: string) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (type) params.set('type', type);
    if (status) params.set('status', status);
    return api.get<{ items: Bill[]; total: number; page: number; pageSize: number }>(`/bills/page?${params}`);
  },
  countByDateRange: (startDate: string, endDate: string) => {
    const params = new URLSearchParams({ startDate, endDate });
    return api.get<{ count: number }>(`/bills/date-range/count?${params}`);
  },
  findByDateRange: (startDate: string, endDate: string) => {
    const params = new URLSearchParams({ startDate, endDate });
    return api.get<Bill[]>(`/bills/date-range?${params}`);
  },
  deleteByDateRange: (startDate: string, endDate: string) =>
    api.delete<{ deletedCount: number }>('/bills/date-range', { startDate, endDate }),
  findByPatient: (patientId: number) => api.get<Bill[]>(`/bills/patient/${patientId}`),
  findOne: (id: number) => api.get<Bill>(`/bills/${id}`),
  createDoctorVisit: (input: CreateDoctorVisitBillInput) =>
    api.post<Bill>('/bills/doctor-visit', input),
  createDiagnostic: (input: CreateDiagnosticBillInput) =>
    api.post<Bill>('/bills/diagnostic', input),
  createPackage: (input: CreatePackageBillInput) => api.post<Bill>('/bills/package', input),
  applyDiscount: (id: number, discountMode: string, discountPercent: string) =>
    api.patch<Bill>(`/bills/${id}/discount`, { discountMode, discountPercent }),
  cancel: (id: number) => api.post<Bill>(`/bills/${id}/cancel`, {}),
};
