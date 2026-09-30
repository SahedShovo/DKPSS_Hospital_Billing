'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Alert } from '@/components/ui/alert';
import { duePaymentApi } from '@/lib/due-payment';
import { ApiError } from '@/lib/api';
import { formatMoneyWithSymbol } from '@/lib/money';
import { Pagination } from '@/components/ui/pagination';

interface PatientDue {
  id: number;
  patientCode: string;
  name: string;
  phone: string;
  outstanding: string;
}

export default function DuePaymentsPage() {
  const [patientDues, setPatientDues] = useState<PatientDue[]>([]);
  const pageSize = 10;
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await duePaymentApi.findPatientsWithOutstanding(page, pageSize);
      setPatientDues(result.items);
      setTotal(result.total);
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
      <h1 className="mb-5 text-xl font-semibold text-gray-900">পুরোনো বাকি আছে এমন রোগী</h1>

      {error && <div className="mb-4"><Alert message={error} /></div>}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Patient Code</th>
              <th className="px-4 py-3">নাম</th>
              <th className="px-4 py-3">ফোন</th>
              <th className="px-4 py-3">বাকি</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">লোড হচ্ছে...</td></tr>
            ) : patientDues.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">কোনো বাকি নেই 🎉</td></tr>
            ) : (
              patientDues.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.patientCode}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.phone}</td>
                  <td className="px-4 py-3 font-semibold text-red-700">{formatMoneyWithSymbol(p.outstanding)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/patients/${p.id}`} className="text-blue-600 hover:underline">
                      প্রোফাইলে যান
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} label="রোগী" />
    </DashboardShell>
  );
}
