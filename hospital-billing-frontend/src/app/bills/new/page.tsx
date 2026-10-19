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
import { ManualBillForm } from '@/components/bill/manual-bill-form';
import { Activity, ClipboardList, Package, Siren, Pill, UserRound } from 'lucide-react';

type BillTypeChoice = 'DOCTOR_VISIT' | 'DIAGNOSTIC' | 'PACKAGE' | 'EMERGENCY' | 'MEDICINE' | null;

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
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Billing</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">নতুন বিল তৈরি</h1>
          <p className="mt-1 text-sm text-slate-500">বিলের ধরন বেছে নিয়ে রোগীর বিল তৈরি করুন।</p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-700"><UserRound size={19} /></span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">নির্বাচিত রোগী</p>
            <p className="text-sm font-semibold text-slate-900">{patient.name}</p>
            <p className="text-xs text-slate-500">{patient.patientCode}</p>
          </div>
        </div>
      </div>

      {!billType ? (
        <Card className="!p-0 overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold text-slate-900">বিলের ধরন নির্বাচন করুন</h2>
            <p className="mt-1 text-sm text-slate-500">যে ধরনের সেবা বা পণ্যের বিল করবেন সেটি বেছে নিন।</p>
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
            {[
              { id: 'DOCTOR_VISIT', title: 'Doctor Visit', desc: 'ডাক্তারের পরামর্শ ও ভিজিট ফি', Icon: Activity, iconClass: 'bg-teal-50 text-teal-700' },
              { id: 'DIAGNOSTIC', title: 'Diagnostic', desc: 'ল্যাব টেস্ট ও পরীক্ষা', Icon: ClipboardList, iconClass: 'bg-blue-50 text-blue-700' },
              { id: 'PACKAGE', title: 'Package', desc: 'নির্ধারিত সেবা প্যাকেজ', Icon: Package, iconClass: 'bg-violet-50 text-violet-700' },
              { id: 'EMERGENCY', title: 'Emergency', desc: 'জরুরি সেবার বিল', Icon: Siren, iconClass: 'bg-rose-50 text-rose-700' },
              { id: 'MEDICINE', title: 'Medicine', desc: 'ওষুধ ও অন্যান্য আইটেম', Icon: Pill, iconClass: 'bg-amber-50 text-amber-700' },
            ].map(({ id, title, desc, Icon, iconClass }) => (
              <button key={id} onClick={() => setBillType(id as Exclude<BillTypeChoice, null>)} className="group flex min-h-24 items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconClass}`}><Icon size={22} strokeWidth={1.9} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">{title}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{desc}</span>
                </span>
                <span className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-teal-700">→</span>
              </button>
            ))}
          </div>
        </Card>
      ) : billType === 'DOCTOR_VISIT' ? (
        <DoctorVisitBillForm patientId={patient.id} onBack={() => setBillType(null)} />
      ) : billType === 'DIAGNOSTIC' ? (
        <DiagnosticBillForm patientId={patient.id} onBack={() => setBillType(null)} />
      ) : billType === 'PACKAGE' ? (
        <PackageBillForm patientId={patient.id} onBack={() => setBillType(null)} />
      ) : (
        <ManualBillForm patientId={patient.id} kind={billType} onBack={() => setBillType(null)} />
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
