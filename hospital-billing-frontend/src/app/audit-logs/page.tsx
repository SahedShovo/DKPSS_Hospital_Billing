'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { auditLogApi } from '@/lib/audit-log';
import { AuditLog } from '@/types/audit-log.types';
import { ApiError } from '@/lib/api';
import { Pagination } from '@/components/ui/pagination';

const TABLE_OPTIONS = [
  '', 'bills', 'admissions', 'payments', 'refunds', 'due_payments', 'expenses',
];

function ActionBadge({ action }: { action: AuditLog['action'] }) {
  const styles = {
    INSERT: 'bg-green-50 text-green-700',
    UPDATE: 'bg-blue-50 text-blue-700',
    DELETE: 'bg-red-50 text-red-700',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[action]}`}>
      {action}
    </span>
  );
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const pageSize = 10;
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [tableName, setTableName] = useState('');
  const [recordId, setRecordId] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await auditLogApi.query({
        tableName: tableName || undefined,
        recordId: recordId ? parseInt(recordId, 10) : undefined,
        page,
        pageSize,
      });
      setLogs(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'লোড করা যায়নি');
    } finally {
      setIsLoading(false);
    }
  }, [tableName, recordId, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <DashboardShell allowedRoles={['ADMIN']}>
      <h1 className="mb-5 text-xl font-semibold text-gray-900">Audit Log</h1>

      <div className="mb-5 flex flex-wrap items-end gap-2">
        <div className="w-full sm:w-48">
          <Select label="Table" value={tableName} onChange={(e) => setTableName(e.target.value)}>
            <option value="">সব Table</option>
            {TABLE_OPTIONS.filter(Boolean).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </div>
        <div className="w-full sm:w-32">
          <Input
            label="Record ID"
            type="number"
            value={recordId}
            onChange={(e) => setRecordId(e.target.value)}
          />
        </div>
        <Button variant="secondary" onClick={() => { setPage(1); load(); }}>
          খুঁজুন
        </Button>
      </div>

      {error && <div className="mb-4"><Alert message={error} /></div>}

      <div className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-gray-400">লোড হচ্ছে...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-400">কোনো Log পাওয়া যায়নি</p>
        ) : (
          logs.map((log) => (
            <Card key={log.id}>
              <button
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                className="flex w-full items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <ActionBadge action={log.action} />
                  <span className="text-sm font-medium text-gray-900">{log.tableName}</span>
                  {log.recordId && (
                    <span className="text-xs text-gray-500">#{log.recordId}</span>
                  )}
                  <span className="text-xs text-gray-400">User ID: {log.userId}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(log.createdAt).toLocaleString('bn-BD')}
                </span>
              </button>

              {expandedId === log.id && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-gray-100 pt-3">
                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-500">আগের মান (Old Value)</p>
                    <pre className="max-h-48 overflow-auto rounded-md bg-gray-50 p-2 text-xs text-gray-700">
                      {log.oldValue ? JSON.stringify(log.oldValue, null, 2) : '—'}
                    </pre>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-500">নতুন মান (New Value)</p>
                    <pre className="max-h-48 overflow-auto rounded-md bg-gray-50 p-2 text-xs text-gray-700">
                      {log.newValue ? JSON.stringify(log.newValue, null, 2) : '—'}
                    </pre>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
      <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} label="লগ" />
    </DashboardShell>
  );
}
