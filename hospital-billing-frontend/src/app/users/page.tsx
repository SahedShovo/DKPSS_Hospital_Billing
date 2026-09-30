'use client';

import { useEffect, useState, useCallback, FormEvent } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Toggle } from '@/components/ui/toggle';
import { userApi } from '@/lib/user';
import { AppUser, UserRole } from '@/types/user.types';
import { ApiError } from '@/lib/api';
import { Pagination } from '@/components/ui/pagination';

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const pageSize = 10;
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState({
    username: '',
    password: '',
    fullName: '',
    role: 'RECEPTIONIST' as UserRole,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await userApi.findPage(page, pageSize);
      setUsers(result.items);
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
      await userApi.create(form);
      setForm({ username: '', password: '', fullName: '', role: 'RECEPTIONIST' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ইউজার তৈরি করা যায়নি');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(user: AppUser) {
    try {
      if (user.isActive) {
        await userApi.deactivate(user.id);
      } else {
        await userApi.update(user.id, { isActive: true });
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'আপডেট করা যায়নি');
    }
  }

  return (
    <DashboardShell allowedRoles={['ADMIN']}>
      <h1 className="mb-5 text-xl font-semibold text-gray-900">ইউজার তালিকা</h1>

      <Card className="mb-5 max-w-2xl">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Username"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
            <Input
              label="Password"
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="পুরো নাম"
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
            <Select
              label="Role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
            >
              <option value="RECEPTIONIST">Receptionist</option>
              <option value="ADMIN">Admin</option>
            </Select>
          </div>

          {error && <Alert message={error} />}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'তৈরি হচ্ছে...' : 'ইউজার তৈরি করুন'}
          </Button>
        </form>
      </Card>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">পুরো নাম</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">সক্রিয়</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">লোড হচ্ছে...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">কোনো ইউজার নেই</td></tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{user.username}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{user.fullName}</td>
                  <td className="px-4 py-3 text-gray-600">{user.role}</td>
                  <td className="px-4 py-3">
                    <Toggle checked={user.isActive} onChange={() => handleToggle(user)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} label="ইউজার" />
    </DashboardShell>
  );
}
