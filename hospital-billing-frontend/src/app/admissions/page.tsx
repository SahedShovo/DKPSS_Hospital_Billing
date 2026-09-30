'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { api } from '@/lib/api';
import { Admission } from '@/types/admission.types';
import { ApiError } from '@/lib/api';
import { Pagination } from '@/components/ui/pagination';

function timeSinceAdmit(admitTime: string): string {
  const diffMs = Date.now() - new Date(admitTime).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return days > 0 ? `${days} দিন ${remHours} ঘণ্টা` : `${hours} ঘণ্টা`;
}

export default function AdmissionsPage() {
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const pageSize = 10;
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<{ items: Admission[]; total: number; page: number; pageSize: number }>(`/admissions/page?page=${page}&pageSize=${pageSize}`);
      setAdmissions(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'লোড করা যায়নি');
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <DashboardShell>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">ভর্তি রোগীর তালিকা</h1>
        <Link href="/admissions/new">
          <Button>+ নতুন ভর্তি</Button>
        </Link>
      </div>
      {error && <div className="mb-4"><Alert message={error} /></div>}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full min-w-[780px] text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">রোগীর নাম</th>
              <th className="px-4 py-3">Bed Type</th>
              <th className="px-4 py-3">ভর্তির সময়</th>
              <th className="px-4 py-3">কতক্ষণ ধরে ভর্তি</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">লোড হচ্ছে...</td></tr>
            ) : admissions.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">এখন কোনো রোগী ভর্তি নেই</td></tr>
            ) : (
              admissions.map((admission) => (
                <tr key={admission.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/patients/${admission.patientId}`} className="font-medium text-gray-900 hover:text-teal-700 hover:underline">
                      {admission.patientName ?? `রোগী #${admission.patientId}`}
                    </Link>
                    {admission.patientCode && <p className="mt-0.5 font-mono text-xs text-gray-500">{admission.patientCode}</p>}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{admission.bedType}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(admission.admitTime).toLocaleString('bn-BD')}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{timeSinceAdmit(admission.admitTime)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admissions/${admission.id}`} className="text-blue-600 hover:underline">
                      বিস্তারিত
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} label="ভর্তি" />
    </DashboardShell>
  );
}
