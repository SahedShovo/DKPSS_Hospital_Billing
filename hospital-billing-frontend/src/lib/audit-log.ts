import { api } from './api';
import { AuditLog } from '@/types/audit-log.types';

export const auditLogApi = {
  query: (params: { tableName?: string; recordId?: number; userId?: number; page?: number; pageSize?: number }) => {
    const usp = new URLSearchParams();
    if (params.tableName) usp.set('tableName', params.tableName);
    if (params.recordId) usp.set('recordId', String(params.recordId));
    if (params.userId) usp.set('userId', String(params.userId));
    usp.set('page', String(params.page ?? 1));
    usp.set('pageSize', String(params.pageSize ?? 50));
    return api.get<{ items: AuditLog[]; total: number; page: number; pageSize: number }>(`/audit-logs?${usp.toString()}`);
  },
};
