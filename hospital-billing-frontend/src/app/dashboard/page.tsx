'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { StatCard } from '@/components/dashboard/stat-card';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { Alert } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';
import { useShift } from '@/hooks/use-shift';
import { dashboardApi } from '@/lib/dashboard';
import { DailySummary } from '@/types/dashboard.types';
import { ApiError } from '@/lib/api';
import { formatMoneyWithSymbol } from '@/lib/money';

function dhakaDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

function todayDate(): string {
  return dhakaDate();
}

function startOfWeek(): string {
  const [year, month, day] = todayDate().split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - (weekday === 0 ? 6 : weekday - 1));
  return date.toISOString().split('T')[0];
}

function startOfMonth(): string {
  const [year, month] = todayDate().split('-');
  return `${year}-${month}-01`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { currentShift } = useShift();
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [from, setFrom] = useState(todayDate());
  const [to, setTo] = useState(todayDate());
  const [activePreset, setActivePreset] = useState<'today' | 'week' | 'month' | null>('today');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (user?.role !== 'ADMIN') return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await dashboardApi.getDailySummary(
        `${from}T00:00:00.000+06:00`,
        `${to}T23:59:59.999+06:00`,
      );
      setSummary(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'রিপোর্ট লোড করা যায়নি');
    } finally {
      setIsLoading(false);
    }
  }, [from, to, user?.role]);

  useEffect(() => {
    load();
  }, [load]);

  function handlePreset(preset: 'today' | 'week' | 'month') {
    setActivePreset(preset);
    const today = todayDate();
    if (preset === 'today') {
      setFrom(today);
      setTo(today);
    } else if (preset === 'week') {
      setFrom(startOfWeek());
      setTo(today);
    } else {
      setFrom(startOfMonth());
      setTo(today);
    }
  }

  if (user?.role !== 'ADMIN') {
    return (
      <DashboardShell>
        <section className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-4 text-center">
          <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
            স্বাগতম, <span className="text-teal-800">{user?.fullName}</span>
          </h1>
          {currentShift ? (
            <p className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-base text-slate-600 sm:text-lg">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
              <span>আপনার Shift চালু আছে, শুরুর ক্যাশ:</span>
              <strong className="font-semibold text-slate-900">
                {formatMoneyWithSymbol(currentShift.openingCash)}
              </strong>
            </p>
          ) : (
            <p className="mt-5 text-base text-slate-600 sm:text-lg">
              কোনো Shift চালু নেই — উপরের বার থেকে Shift চালু করুন।
            </p>
          )}
        </section>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell allowedRoles={['ADMIN']}>
      <div className="mb-6 border-b border-slate-200 pb-5">
        <p className="mb-1 text-xs font-semibold uppercase text-teal-700">DKPSSHP</p>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">দৈনিক আর্থিক সারসংক্ষেপ</p>
      </div>

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
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="মোট বিলিং (Net Billing)" value={summary.netBilling} />
            <StatCard label="ক্যাশ জমা (Cash Collection)" value={summary.cashCollection} tone="positive" />
            <StatCard label="পুরোনো বাকি জমা" value={summary.oldDueCollected} tone="positive" />
            <StatCard label="Refund" value={summary.refund} tone="negative" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard label="মোট আয় (Income)" value={summary.income} tone="positive" />
            <StatCard label="মোট খরচ (Expense)" value={summary.expense} tone="negative" />
            <StatCard
              label="লাভ (Profit)"
              value={summary.profit}
              tone={parseFloat(summary.profit) >= 0 ? 'positive' : 'negative'}
            />
          </div>
        </>
      ) : null}
    </DashboardShell>
  );
}
