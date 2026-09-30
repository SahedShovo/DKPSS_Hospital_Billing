'use client';

import { useEffect, useState, useCallback, FormEvent } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Toggle } from '@/components/ui/toggle';
import { testApi } from '@/lib/test';
import { LabTest } from '@/types/test.types';
import { ApiError } from '@/lib/api';
import { formatMoneyWithSymbol } from '@/lib/money';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmModal } from '@/components/ui/confirm-modal';

export default function TestsPage() {
  const [tests, setTests] = useState<LabTest[]>([]);
  const pageSize = 10;
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState({ name: '', price: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testToDelete, setTestToDelete] = useState<LabTest | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await testApi.findPage(page, pageSize);
      setTests(result.items);
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

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await testApi.create({ name: form.name, price: form.price });
      setForm({ name: '', price: '' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'তৈরি করা যায়নি');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(test: LabTest) {
    try {
      await testApi.update(test.id, { isActive: !test.isActive });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'আপডেট করা যায়নি');
    }
  }

  async function handlePriceSave(id: number) {
    try {
      await testApi.update(id, { price: editPrice });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'দাম আপডেট করা যায়নি');
    }
  }

  async function handleDelete() {
    if (!testToDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      await testApi.remove(testToDelete.id);
      setTotal((count) => Math.max(0, count - 1));
      setTestToDelete(null);
      if (tests.length === 1 && page > 1) setPage((current) => current - 1);
      else await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'টেস্ট মুছে ফেলা যায়নি');
      setTestToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <DashboardShell allowedRoles={['ADMIN']}>
      <h1 className="mb-5 text-xl font-semibold text-gray-900">টেস্ট তালিকা</h1>

      <Card className="mb-5 max-w-md">
        <form onSubmit={handleCreate} className="space-y-3">
          <Input
            label="টেস্টের নাম"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="দাম"
            type="number"
            step="0.01"
            min="0"
            required
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
          <Button type="submit" disabled={isSubmitting}>
            যোগ করুন
          </Button>
        </form>
      </Card>

      {error && <div className="mb-4"><Alert message={error} /></div>}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">নাম</th>
              <th className="px-4 py-3">দাম</th>
              <th className="px-4 py-3">সক্রিয়</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">লোড হচ্ছে...</td></tr>
            ) : tests.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">কোনো টেস্ট নেই</td></tr>
            ) : (
              tests.map((test) => (
                <tr key={test.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{test.name}</td>
                  <td className="px-4 py-3">
                    {editingId === test.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.01"
                          autoFocus
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-24 rounded border border-gray-300 px-2 py-1 text-xs"
                        />
                        <button
                          onClick={() => handlePriceSave(test.id)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          সেভ
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-gray-500 hover:underline"
                        >
                          বাতিল
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(test.id);
                          setEditPrice(test.price);
                        }}
                        className="text-gray-900 hover:text-blue-600"
                      >
                        {formatMoneyWithSymbol(test.price)}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Toggle checked={test.isActive} onChange={() => handleToggle(test)} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setTestToDelete(test)}
                      className="inline-flex min-h-9 items-center rounded-md border border-red-200 bg-red-50 px-3 text-xs font-medium text-red-700 hover:bg-red-100"
                    >
                      মুছুন
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} label="টেস্ট" />
      {testToDelete && (
        <ConfirmModal
          title="টেস্ট মুছে ফেলবেন?"
          message={`${testToDelete.name} মুছে ফেলা হবে। বিলের রেকর্ড থাকলে এটি মুছতে পারবেন না।`}
          confirmLabel="টেস্ট মুছুন"
          isSubmitting={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setTestToDelete(null)}
        />
      )}
    </DashboardShell>
  );
}
