'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { patientApi } from '@/lib/patient';
import { admissionApi } from '@/lib/admission';
import { Patient } from '@/types/patient.types';
import { BedType } from '@/types/admission.types';
import { ApiError } from '@/lib/api';

export default function NewAdmissionPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);

  const [bedType, setBedType] = useState<BedType>('GENERAL');
  const [bedRate, setBedRate] = useState('');
  const [admissionFee, setAdmissionFee] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const patientIdParam = new URLSearchParams(window.location.search).get('patientId');
    if (!patientIdParam) return;

    const patientId = Number(patientIdParam);
    if (!Number.isInteger(patientId) || patientId <= 0) {
      setError('রোগীর তথ্য সঠিক নয়');
      return;
    }

    setIsLoadingPatient(true);
    patientApi.findOne(patientId)
      .then((patient) => setSelectedPatient(patient))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'রোগী পাওয়া যায়নি'))
      .finally(() => setIsLoadingPatient(false));
  }, []);

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const isPhoneLike = /^\d+$/.test(searchQuery.trim());
      const data = isPhoneLike
        ? await patientApi.search({ phone: searchQuery.trim() })
        : await patientApi.search({ name: searchQuery.trim() });
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  async function handleSubmit() {
    if (!selectedPatient) {
      setError('আগে একজন রোগী নির্বাচন করুন');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const admission = await admissionApi.admit({
        patientId: selectedPatient.id,
        bedType,
        bedRate,
        admissionFee,
      });
      router.push(`/admissions/${admission.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ভর্তি করা যায়নি');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DashboardShell>
      <h1 className="mb-5 text-xl font-semibold text-gray-900">নতুন রোগী ভর্তি</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Card>
          <h2 className="mb-3 text-sm font-medium text-gray-900">১. রোগী নির্বাচন করুন</h2>

          {isLoadingPatient ? (
            <p className="text-sm text-gray-500">রোগীর তথ্য লোড হচ্ছে...</p>
          ) : selectedPatient ? (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{selectedPatient.name}</p>
                  <p className="font-mono text-xs text-gray-500">{selectedPatient.patientCode}</p>
                  <p className="text-xs text-gray-500">{selectedPatient.phone}</p>
                </div>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  পরিবর্তন করুন
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                <div className="min-w-0 flex-1">
                  <Input
                    placeholder="নাম বা ফোন নম্বর দিয়ে খুঁজুন..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <Button variant="secondary" onClick={handleSearch} disabled={isSearching}>
                  খুঁজুন
                </Button>
              </div>
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {results.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    className="w-full rounded-md border border-gray-200 p-2 text-left text-sm hover:border-blue-500 hover:bg-blue-50"
                  >
                    <span className="font-medium text-gray-900">{patient.name}</span>
                    <span className="ml-2 font-mono text-xs text-gray-500">{patient.patientCode}</span>
                    <span className="ml-2 text-xs text-gray-500">{patient.phone}</span>
                  </button>
                ))}
                {results.length === 0 && searchQuery && !isSearching && (
                  <p className="text-xs text-gray-400">কোনো রোগী পাওয়া যায়নি</p>
                )}
              </div>
            </>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-medium text-gray-900">২. ভর্তির তথ্য</h2>
          <div className="space-y-4">
            <Select label="Bed Type" value={bedType} onChange={(e) => setBedType(e.target.value as BedType)}>
              <option value="GENERAL">General</option>
              <option value="WARD">Ward</option>
              <option value="VIP_CABIN">VIP Cabin</option>
            </Select>
            <Input
              label="Bed Rate (প্রতি ১২ ঘণ্টা)"
              type="number"
              step="0.01"
              min="0"
              required
              value={bedRate}
              onChange={(e) => setBedRate(e.target.value)}
            />
            <Input
              label="Admission Fee"
              type="number"
              step="0.01"
              min="0"
              required
              value={admissionFee}
              onChange={(e) => setAdmissionFee(e.target.value)}
            />

            {error && <Alert message={error} />}

            <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'ভর্তি হচ্ছে...' : 'ভর্তি নিশ্চিত করুন'}
            </Button>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
