import { api } from './api';
import { Expense, CreateExpenseInput } from '@/types/expense.types';

export const expenseApi = {
  findAll: () => api.get<Expense[]>('/expenses'),
  findPage: (page: number, pageSize = 10) => api.get<{ items: Expense[]; total: number; page: number; pageSize: number; todayTotal: string }>(`/expenses/page?page=${page}&pageSize=${pageSize}`),
  create: (input: CreateExpenseInput) => api.post<Expense>('/expenses', input),
  update: (id: number, input: Partial<CreateExpenseInput>) =>
    api.patch<Expense>(`/expenses/${id}`, input),
};
