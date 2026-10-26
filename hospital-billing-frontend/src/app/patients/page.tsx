'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { patientApi } from '@/lib/patient';
import { Patient } from '@/types/patient.types';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';

export default function PatientsPage() {
  const pageSize = 10;
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const searchSequence = useRef(0);

  const loadPatients = useCallback(async (targetPage: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await patientApi.findPage(targetPage, pageSize);
      setPatients(data.items);
      setTotalPatients(data.total);
      setPage(data.page);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'রোগীর তালিকা লোড করা যায়নি');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSearchMode) loadPatients(page);
  }, [loadPatients, page, isSearchMode]);

  const searchPatients = useCallback(async (query: string, requestId = ++searchSequence.current) => {
    if (requestId !== searchSequence.current) return;
    setIsLoading(true);
    setError(null);
    try {
      const results = await patientApi.search({ query });
      if (requestId !== searchSequence.current) return;
      setPatients(results);
      setTotalPatients(results.length);
      setIsSearchMode(true);
    } catch (err) {
      if (requestId === searchSequence.current) {
        setError(err instanceof ApiError ? err.message : 'খোঁজা যায়নি');
      }
    } finally {
      if (requestId === searchSequence.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    const requestId = ++searchSequence.current;
    if (query.length < 2) {
      setIsSearchMode(false);
      setPage(1);
      return;
    }
    const timer = setTimeout(() => {
      void searchPatients(query, requestId);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, searchPatients]);

  function handleSearch() {
    const query = searchQuery.trim();
    if (query.length >= 2) void searchPatients(query);
    else {
      setIsSearchMode(false);
      setPage(1);
    }
  }

  async function handleDelete() {
    if (!patientToDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      await patientApi.remove(patientToDelete.id);
      setPatients((current) => current.filter((patient) => patient.id !== patientToDelete.id));
      setTotalPatients((current) => Math.max(0, current - 1));
      setPatientToDelete(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'রোগী মুছে ফেলা যায়নি');
      setPatientToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <DashboardShell>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">রোগী তালিকা</h1>
        <Link href="/patients/new">
          <Button>+ নতুন রোগী</Button>
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="min-w-0 flex-1">
          <Input
            placeholder="নাম, রোগী কোড বা ফোন"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button variant="secondary" onClick={handleSearch} disabled={isLoading}>
          {isLoading ? 'খোঁজা হচ্ছে...' : 'খুঁজুন'}
        </Button>
      </div>
      <p className="-mt-2 mb-4 text-xs text-slate-500">
        {searchQuery.trim().length === 1
          ? 'সাজেশন দেখতে আরও একটি অক্ষর লিখুন'
          : searchQuery.trim().length >= 2
            ? 'নাম, রোগী কোড ও ফোন নম্বরে মিল থাকা রোগী দেখানো হচ্ছে'
            : 'Patients List'}
      </p>

      {error && <div className="mb-4"><Alert message={error} /></div>}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Patient Code</th>
              <th className="px-4 py-3">নাম</th>
              <th className="px-4 py-3">বয়স</th>
              <th className="px-4 py-3">লিঙ্গ</th>
              <th className="px-4 py-3">ফোন</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  লোড হচ্ছে...
                </td>
              </tr>
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  কোনো রোগী পাওয়া যায়নি
                </td>
              </tr>
            ) : (
              patients.map((patient) => (
                <tr key={patient.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{patient.patientCode}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{patient.name}</td>
                  <td className="px-4 py-3 text-gray-600">{patient.age}</td>
                  <td className="px-4 py-3 text-gray-600">{patient.gender}</td>
                  <td className="px-4 py-3 text-gray-600">{patient.phone}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/patients/${patient.id}`}
                        className="inline-flex min-h-9 items-center justify-center rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                      >
                        বিস্তারিত
                      </Link>
                      {user?.role === 'ADMIN' && (
                        <button
                          type="button"
                          onClick={() => setPatientToDelete(patient)}
                          className="inline-flex min-h-9 items-center justify-center rounded-md border border-red-200 bg-red-50 px-3 text-xs font-medium text-red-700 transition-colors hover:border-red-300 hover:bg-red-100"
                        >
                          মুছুন
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isSearchMode && totalPatients > pageSize && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="text-sm text-slate-600">
            {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, totalPatients)} / {totalPatients} রোগী
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={isLoading || page <= 1} onClick={() => setPage((current) => current - 1)}>
              আগের
            </Button>
            <Button variant="secondary" disabled={isLoading || page * pageSize >= totalPatients} onClick={() => setPage((current) => current + 1)}>
              পরের
            </Button>
          </div>
        </div>
      )}

      {patientToDelete && (
        <ConfirmModal
          title="রোগী মুছে ফেলবেন?"
          message={`${patientToDelete.name} (${patientToDelete.patientCode})-এর patient record মুছে যাবে। বিল, ভর্তি বা payment record থাকলে history রক্ষার জন্য system মুছতে দেবে না।`}
          confirmLabel="রোগী মুছুন"
          isSubmitting={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setPatientToDelete(null)}
        />
      )}
    </DashboardShell>
  );
}
