'use client';

import { useEffect, useState, useCallback, FormEvent } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Toggle } from '@/components/ui/toggle';
import { doctorApi } from '@/lib/doctor';
import { Doctor } from '@/types/doctor.types';
import { ApiError } from '@/lib/api';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { Pagination } from '@/components/ui/pagination';

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const pageSize = 10;
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doctorToDelete, setDoctorToDelete] = useState<Doctor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await doctorApi.findPage(page, pageSize);
      setDoctors(result.items);
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
      await doctorApi.create({ name });
      setName('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'তৈরি করা যায়নি');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(doctor: Doctor) {
    try {
      await doctorApi.update(doctor.id, { isActive: !doctor.isActive });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'আপডেট করা যায়নি');
    }
  }

  async function handleDelete() {
    if (!doctorToDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      await doctorApi.remove(doctorToDelete.id);
      if (doctors.length === 1 && page > 1) setPage(page - 1);
      else await load();
      setDoctorToDelete(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ডাক্তার মুছে ফেলা যায়নি');
      setDoctorToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <DashboardShell allowedRoles={['ADMIN']}>
      <h1 className="mb-5 text-xl font-semibold text-gray-900">ডাক্তার তালিকা</h1>

      <Card className="mb-5 max-w-md">
        <form onSubmit={handleCreate} className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              label="নতুন ডাক্তারের নাম"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
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
              <th className="px-4 py-3">সক্রিয়</th>
              <th className="px-4 py-3 text-right">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">লোড হচ্ছে...</td></tr>
            ) : doctors.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">কোনো ডাক্তার নেই</td></tr>
            ) : (
              doctors.map((doctor) => (
                <tr key={doctor.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{doctor.name}</td>
                  <td className="px-4 py-3">
                    <Toggle checked={doctor.isActive} onChange={() => handleToggle(doctor)} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setDoctorToDelete(doctor)}
                      className="inline-flex min-h-9 items-center justify-center rounded-md border border-red-200 bg-red-50 px-3 text-xs font-medium text-red-700 transition-colors hover:border-red-300 hover:bg-red-100"
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
      <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} label="ডাক্তার" />
      {doctorToDelete && (
        <ConfirmModal
          title="ডাক্তার মুছে ফেলবেন?"
          message={`${doctorToDelete.name} মুছে ফেলা হবে। বিলের রেকর্ড থাকা ডাক্তারকে মুছে ফেলা যাবে না।`}
          confirmLabel="ডাক্তার মুছুন"
          isSubmitting={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setDoctorToDelete(null)}
        />
      )}
    </DashboardShell>
  );
}
