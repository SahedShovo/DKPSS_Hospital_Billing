'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { patientApi } from '@/lib/patient';
import { Patient } from '@/types/patient.types';
import { ApiError } from '@/lib/api';
import { DoctorVisitBillForm } from '@/components/bill/doctor-visit-bill-form';
import { DiagnosticBillForm } from '@/components/bill/diagnostic-bill-form';
import { PackageBillForm } from '@/components/bill/package-bill-form';

type BillTypeChoice = 'DOCTOR_VISIT' | 'DIAGNOSTIC' | 'PACKAGE' | null;

function NewBillContent() {
  const searchParams = useSearchParams();
  const patientId = Number(searchParams.get('patientId'));

  const [patient, setPatient] = useState<Patient | null>(null);
  const [billType, setBillType] = useState<BillTypeChoice>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!patientId) {
      setError('কোনো রোগী নির্বাচিত হয়নি — Patient page থেকে "নতুন বিল" এ ক্লিক করুন');
      setIsLoading(false);
      return;
    }
    patientApi
      .findOne(patientId)
      .then(setPatient)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'রোগী পাওয়া যায়নি'))
      .finally(() => setIsLoading(false));
  }, [patientId]);

  if (isLoading) {
    return (
      <DashboardShell>
        <p className="text-sm text-gray-500">লোড হচ্ছে...</p>
      </DashboardShell>
    );
  }

  if (error || !patient) {
    return (
      <DashboardShell>
        <Alert message={error ?? 'রোগী পাওয়া যায়নি'} />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">নতুন বিল</h1>
        <p className="text-sm text-gray-500">
          রোগী: <strong>{patient.name}</strong> ({patient.patientCode})
        </p>
      </div>

      {!billType ? (
        <Card className="max-w-md">
          <p className="mb-4 text-sm font-medium text-gray-700">বিলের ধরন নির্বাচন করুন</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              onClick={() => setBillType('DOCTOR_VISIT')}
              className="rounded-md border border-gray-300 px-4 py-6 text-sm font-medium text-gray-700 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700"
            >
              🩺 Doctor Visit
            </button>
            <button
              onClick={() => setBillType('DIAGNOSTIC')}
              className="rounded-md border border-gray-300 px-4 py-6 text-sm font-medium text-gray-700 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700"
            >
              🧪 Diagnostic
            </button>
            <button
              onClick={() => setBillType('PACKAGE')}
              className="rounded-md border border-gray-300 px-4 py-6 text-sm font-medium text-gray-700 hover:border-teal-500 hover:bg-teal-50 hover:text-teal-700"
            >
              ▦ Package
            </button>
          </div>
        </Card>
      ) : billType === 'DOCTOR_VISIT' ? (
        <DoctorVisitBillForm patientId={patient.id} onBack={() => setBillType(null)} />
      ) : billType === 'DIAGNOSTIC' ? (
        <DiagnosticBillForm patientId={patient.id} onBack={() => setBillType(null)} />
      ) : (
        <PackageBillForm patientId={patient.id} onBack={() => setBillType(null)} />
      )}
    </DashboardShell>
  );
}

export default function NewBillPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">লোড হচ্ছে...</div>}>
      <NewBillContent />
    </Suspense>
  );
}
