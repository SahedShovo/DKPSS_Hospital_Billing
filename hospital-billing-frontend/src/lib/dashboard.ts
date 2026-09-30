import { api } from './api';
import { DailySummary } from '@/types/dashboard.types';

export const dashboardApi = {
  getDailySummary: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const query = params.toString();
    return api.get<DailySummary>(`/dashboard/daily-summary${query ? `?${query}` : ''}`);
  },
};