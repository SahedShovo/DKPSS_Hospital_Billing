import { api } from './api';
import { Payment } from '@/types/payment.types';

export const paymentApi = {
  create: (billId: number, amount: string) => api.post<Payment>('/payments', { billId, amount }),
  findByBill: (billId: number) => api.get<Payment[]>(`/payments/bill/${billId}`),
};