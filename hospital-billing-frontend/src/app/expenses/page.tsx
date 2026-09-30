'use client';

import { useEffect, useState, useCallback, FormEvent } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { expenseApi } from '@/lib/expense';
import { Expense } from '@/types/expense.types';
import { ApiError } from '@/lib/api';
import { formatMoneyWithSymbol } from '@/lib/money';
import { Pagination } from '@/components/ui/pagination';

function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const pageSize = 10;
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [todayTotal, setTodayTotal] = useState('0');
  const [form, setForm] = useState({
    expenseDate: todayDate(),
    expenseType: '',
    amount: '',
    description: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await expenseApi.findPage(page, pageSize);
      setExpenses(data.items);
      setTotal(data.total);
      setTodayTotal(data.todayTotal);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'লোড করা যায়নি');
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await expenseApi.create({
        expenseDate: form.expenseDate,
        expenseType: form.expenseType,
        amount: form.amount,
        description: form.description || undefined,
      });
      setForm({ expenseDate: todayDate(), expenseType: '', amount: '', description: '' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'যোগ করা যায়নি');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DashboardShell allowedRoles={['ADMIN']}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">খরচের হিসাব</h1>
        <div className="text-right">
          <p className="text-xs text-gray-500">আজকের মোট খরচ</p>
          <p className="text-lg font-semibold text-red-700">{formatMoneyWithSymbol(todayTotal)}</p>
        </div>
      </div>

      <Card className="mb-5 max-w-2xl">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <Input
              label="তারিখ"
              type="date"
              required
              value={form.expenseDate}
              onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
            />
            <Input
              label="খরচের ধরন"
              placeholder="যেমন: Electricity, Salary"
              required
              value={form.expenseType}
              onChange={(e) => setForm({ ...form, expenseType: e.target.value })}
            />
            <Input
              label="পরিমাণ"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <Input
            label="বিবরণ (ঐচ্ছিক)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          {error && <Alert message={error} />}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'খরচ যোগ করুন'}
          </Button>
        </form>
      </Card>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">তারিখ</th>
              <th className="px-4 py-3">ধরন</th>
              <th className="px-4 py-3">বিবরণ</th>
              <th className="px-4 py-3 text-right">পরিমাণ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">লোড হচ্ছে...</td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">কোনো খরচ নেই</td></tr>
            ) : (
              expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{expense.expenseDate}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{expense.expenseType}</td>
                  <td className="px-4 py-3 text-gray-500">{expense.description ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-700">
                    {formatMoneyWithSymbol(expense.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} label="খরচ" />
    </DashboardShell>
  );
}
