'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { StatCard } from '@/components/dashboard/stat-card';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { dashboardApi } from '@/lib/dashboard';
import { DailySummary } from '@/types/dashboard.types';
import { ApiError } from '@/lib/api';
import { formatMoneyWithSymbol } from '@/lib/money';

function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}
function startOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
}
function startOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
}

export default function ReportsPage() {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo] = useState(todayDate());
  const [activePreset, setActivePreset] = useState<'today' | 'week' | 'month' | null>('month');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dashboardApi.getDailySummary(
        `${from}T00:00:00.000Z`,
        `${to}T23:59:59.999Z`,
      );
      setSummary(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'রিপোর্ট লোড করা যায়নি');
    } finally {
      setIsLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  function handlePreset(preset: 'today' | 'week' | 'month') {
    setActivePreset(preset);
    const today = todayDate();
    if (preset === 'today') { setFrom(today); setTo(today); }
    else if (preset === 'week') { setFrom(startOfWeek()); setTo(today); }
    else { setFrom(startOfMonth()); setTo(today); }
  }

  return (
    <DashboardShell allowedRoles={['ADMIN']}>
      <h1 className="mb-5 text-xl font-semibold text-gray-900">বিস্তারিত রিপোর্ট</h1>

      <DateRangePicker
        from={from}
        to={to}
        onFromChange={(value) => {
          setFrom(value);
          setActivePreset(null);
        }}
        onToChange={(value) => {
          setTo(value);
          setActivePreset(null);
        }}
        onApply={load}
        onPreset={handlePreset}
        activePreset={activePreset}
      />

      {error && <div className="mb-4"><Alert message={error} /></div>}

      {isLoading ? (
        <p className="text-sm text-gray-400">লোড হচ্ছে...</p>
      ) : summary ? (
        <Card>
          <h2 className="mb-4 text-sm font-medium text-gray-900">
            {from} থেকে {to} পর্যন্ত হিসাব
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-500">মোট বিলিং (Net Billing)</span>
              <span className="font-medium text-gray-900">{formatMoneyWithSymbol(summary.netBilling)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-500">ক্যাশ জমা (Payments)</span>
              <span className="font-medium text-green-700">{formatMoneyWithSymbol(summary.cashCollection)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-500">পুরোনো বাকি জমা</span>
              <span className="font-medium text-green-700">{formatMoneyWithSymbol(summary.oldDueCollected)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-500">Refund</span>
              <span className="font-medium text-red-700">{formatMoneyWithSymbol(summary.refund)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2 pt-1 font-semibold">
              <span className="text-gray-900">মোট আয় (Income)</span>
              <span className="text-green-700">{formatMoneyWithSymbol(summary.income)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-500">মোট খরচ (Expense)</span>
              <span className="font-medium text-red-700">{formatMoneyWithSymbol(summary.expense)}</span>
            </div>
            <div className="flex justify-between pt-2 text-base font-bold">
              <span className="text-gray-900">লাভ (Profit)</span>
              <span className={parseFloat(summary.profit) >= 0 ? 'text-green-700' : 'text-red-700'}>
                {formatMoneyWithSymbol(summary.profit)}
              </span>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard label="মোট বিলিং" value={summary?.netBilling ?? '0'} />
        <StatCard label="মোট আয়" value={summary?.income ?? '0'} tone="positive" />
        <StatCard label="লাভ" value={summary?.profit ?? '0'} tone={parseFloat(summary?.profit ?? '0') >= 0 ? 'positive' : 'negative'} />
      </div>
    </DashboardShell>
  );
}