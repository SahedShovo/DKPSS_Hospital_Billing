import { api } from './api';

export interface DuePayment {
  id: number;
  patientId: number;
  receivedBy: number;
  shiftId: number;
  amount: string;
  paidAt: string;
  patientName?: string;
  patientCode?: string;
  patientPhone?: string;
  receivedByName?: string;
  allocations?: Array<{ billId: number; billNo: string; amount: string }>;
}

export const duePaymentApi = {
  findPatientsWithOutstanding: (page = 1, pageSize = 10) =>
    api.get<{ items: Array<{ id: number; patientCode: string; name: string; phone: string; outstanding: string }>; total: number; page: number; pageSize: number }>(
      `/due-payments/outstanding-patients?page=${page}&pageSize=${pageSize}`,
    ),
  getOutstanding: (patientId: number) =>
    api.get<{ patientId: number; outstanding: string }>(`/due-payments/patient/${patientId}/outstanding`),
  create: (patientId: number, amount: string) =>
    api.post<DuePayment>('/due-payments', { patientId, amount }),
  findByPatient: (patientId: number) =>
    api.get<DuePayment[]>(`/due-payments/patient/${patientId}`),
  findOne: (id: number) => api.get<DuePayment>(`/due-payments/${id}`),
};
