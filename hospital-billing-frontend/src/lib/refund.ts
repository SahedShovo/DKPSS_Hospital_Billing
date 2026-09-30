import { api } from './api';
import { Refund } from '@/types/payment.types';

export const refundApi = {
  create: (billId: number, amount: string) => api.post<Refund>('/refunds', { billId, amount }),
  findByBill: (billId: number) => api.get<Refund[]>(`/refunds/bill/${billId}`),
};