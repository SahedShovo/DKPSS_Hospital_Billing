'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { admissionApi } from '@/lib/admission';
import { billApi } from '@/lib/bill';
import { patientApi } from '@/lib/patient';
import { Admission } from '@/types/admission.types';
import { Bill } from '@/types/bill.types';
import { Patient } from '@/types/patient.types';
import { ApiError } from '@/lib/api';
import { formatMoneyWithSymbol } from '@/lib/money';

function timeSinceAdmit(admitTime: string, dischargeTime: string | null): string {
  const end = dischargeTime ? new Date(dischargeTime).getTime() : Date.now();
  const diffMs = end - new Date(admitTime).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return days > 0 ? `${days} দিন ${remHours} ঘণ্টা` : `${hours} ঘণ্টা`;
}

export default function AdmissionDetailPage() {
  const params = useParams();
  const admissionId = Number(params.id);

  const [admission, setAdmission] = useState<Admission | null>(null);
  const [bill, setBill] = useState<Bill | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showDischargeConfirm, setShowDischargeConfirm] = useState(false);
  const [isDischarging, setIsDischarging] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const admissionData = await admissionApi.findOne(admissionId);
      setAdmission(admissionData);
      const [billData, patientData] = await Promise.all([
        billApi.findOne(admissionData.billId),
        patientApi.findOne(admissionData.patientId),
      ]);
      setBill(billData);
      setPatient(patientData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'তথ্য পাওয়া যায়নি');
    } finally {
      setIsLoading(false);
    }
  }, [admissionId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRefreshBedCharge() {
    setActionError(null);
    setIsRefreshing(true);
    try {
      await admissionApi.refreshBedCharge(admissionId);
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'রিফ্রেশ করা যায়নি');
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleDischarge() {
    setActionError(null);
    setIsDischarging(true);
    try {
      await admissionApi.discharge(admissionId);
      setShowDischargeConfirm(false);
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Discharge করা যায়নি');
    } finally {
      setIsDischarging(false);
    }
  }

  if (isLoading) {
    return (
      <DashboardShell>
        <p className="text-sm text-gray-500">লোড হচ্ছে...</p>
      </DashboardShell>
    );
  }

  if (error || !admission || !bill) {
    return (
      <DashboardShell>
        <Alert message={error ?? 'তথ্য পাওয়া যায়নি'} />
      </DashboardShell>
    );
  }

  const isAdmitted = admission.status === 'ADMITTED';
  const bedItem = bill.items?.find((i) => i.itemType === 'BED');
  const feeItem = bill.items?.find((i) => i.itemType === 'ADMISSION_FEE');
  const netDue = Number(bill.dueAmount) > 0;
  const stayDuration = timeSinceAdmit(admission.admitTime, admission.dischargeTime);
  const admitDate = new Date(admission.admitTime).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const dischargeDate = admission.dischargeTime
    ? new Date(admission.dischargeTime).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null;

  return (
    <DashboardShell>
      <div className="admission-detail-page mx-auto max-w-6xl space-y-5 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/admissions" className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-teal-800">
            <span aria-hidden="true">←</span> ভর্তি তালিকায় ফিরুন
          </Link>
          <Link href={`/bills/${admission.billId}`} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800">
            বিল দেখুন <span className="font-mono">{bill.billNo}</span> <span aria-hidden="true">↗</span>
          </Link>
        </div>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
          <div className="flex flex-col gap-5 border-b border-slate-100 bg-gradient-to-br from-teal-50 via-white to-slate-50 p-5 sm:p-7 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isAdmitted ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                  {isAdmitted ? 'ভর্তি চলমান' : 'ছুটি সম্পন্ন'}
                </span>
                <span className="rounded-full border border-teal-200 bg-white/80 px-2.5 py-1 text-xs font-medium text-teal-800">{admission.bedType.replaceAll('_', ' ')}</span>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Admission record</p>
              <h1 className="mt-1 font-mono text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">ADM-{String(admission.id).padStart(6, '0')}</h1>
              <p className="mt-2 text-sm text-slate-500">ভর্তির সময়: {admitDate}</p>
              {dischargeDate && <p className="mt-1 text-sm text-slate-500">ছুটির সময়: {dischargeDate}</p>}
            </div>

            {isAdmitted && (
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Button variant="secondary" onClick={handleRefreshBedCharge} disabled={isRefreshing}>
                  {isRefreshing ? 'হিসাব হচ্ছে...' : 'চার্জ আপডেট'}
                </Button>
                <Button variant="danger" onClick={() => setShowDischargeConfirm(true)}>ছুটি দিন</Button>
              </div>
            )}
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-xs font-medium text-slate-500">রোগী</p>
              <p className="mt-1 truncate text-base font-semibold text-slate-900">{patient?.name ?? `রোগী #${admission.patientId}`}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                {patient?.patientCode && <span className="font-mono">{patient.patientCode}</span>}
                {patient?.phone && <span>{patient.phone}</span>}
              </div>
            </div>
            <div className="flex items-center sm:justify-end">
              <Link href={`/patients/${admission.patientId}`} className="inline-flex min-h-10 items-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-teal-800 transition hover:border-teal-300 hover:bg-teal-50">
                রোগীর প্রোফাইল দেখুন <span className="ml-2" aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
        </section>

        {actionError && <Alert message={actionError} />}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="relative overflow-hidden p-4 sm:p-5">
            <span className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-md bg-teal-50 text-teal-700" aria-hidden="true">◷</span>
            <p className="text-xs font-medium text-slate-500">{isAdmitted ? 'ভর্তির সময়কাল' : 'মোট অবস্থান'}</p>
            <p className="mt-2 pr-10 text-lg font-bold text-slate-900">{stayDuration}</p>
            <p className="mt-1 text-xs text-slate-400">{isAdmitted ? 'এখন পর্যন্ত' : 'সম্পূর্ণ'}</p>
          </Card>
          <Card className="relative overflow-hidden p-4 sm:p-5">
            <span className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-md bg-teal-50 text-teal-700" aria-hidden="true">▦</span>
            <p className="text-xs font-medium text-slate-500">Bed Type</p>
            <p className="mt-2 pr-10 text-lg font-bold text-slate-900">{admission.bedType.replaceAll('_', ' ')}</p>
            <p className="mt-1 text-xs text-slate-400">{formatMoneyWithSymbol(admission.bedRate)} / ১২ ঘণ্টা</p>
          </Card>
          <Card className="relative overflow-hidden p-4 sm:p-5">
            <span className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-700" aria-hidden="true">৳</span>
            <p className="text-xs font-medium text-slate-500">মোট বিল</p>
            <p className="mt-2 pr-10 text-lg font-bold text-slate-900">{formatMoneyWithSymbol(bill.netAmount)}</p>
            <p className="mt-1 text-xs text-slate-400">{bill.payments?.length ?? 0}টি পেমেন্ট</p>
          </Card>
          <Card className={`relative overflow-hidden p-4 sm:p-5 ${netDue ? 'border-amber-200 bg-amber-50/70' : ''}`}>
            <span className={`absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-md ${netDue ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`} aria-hidden="true">৳</span>
            <p className="text-xs font-medium text-slate-500">বাকি</p>
            <p className={`mt-2 pr-10 text-lg font-bold ${netDue ? 'text-amber-800' : 'text-slate-700'}`}>{formatMoneyWithSymbol(bill.dueAmount)}</p>
            <p className="mt-1 text-xs text-slate-400">জমা {formatMoneyWithSymbol(bill.totalPaid)}</p>
          </Card>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <h2 className="font-semibold text-slate-900">ভর্তি খরচের হিসাব</h2>
            <p className="mt-1 text-xs text-slate-500">ভর্তি ফি ও বেড চার্জ</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-5 py-3 sm:px-6">খরচের খাত</th>
                  <th className="px-4 py-3">একক মূল্য</th>
                  <th className="px-4 py-3 text-center">পরিমাণ</th>
                  <th className="px-5 py-3 text-right sm:px-6">মোট</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {feeItem && (
                  <tr className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5 font-medium text-slate-900 sm:px-6">{feeItem.itemName}</td>
                    <td className="px-4 py-3.5 text-slate-600">{formatMoneyWithSymbol(feeItem.unitPrice)}</td>
                    <td className="px-4 py-3.5 text-center text-slate-600">{feeItem.quantity}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-900 sm:px-6">{formatMoneyWithSymbol(feeItem.amount)}</td>
                  </tr>
                )}
                {bedItem && (
                  <tr className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5 font-medium text-slate-900 sm:px-6">{bedItem.itemName}</td>
                    <td className="px-4 py-3.5 text-slate-600">{formatMoneyWithSymbol(bedItem.unitPrice)} / ১২ ঘণ্টা</td>
                    <td className="px-4 py-3.5 text-center text-slate-600">{bedItem.quantity} ব্লক</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-900 sm:px-6">{formatMoneyWithSymbol(bedItem.amount)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end border-t border-slate-100 bg-slate-50/50 px-5 py-5 sm:px-6">
            <div className="w-full space-y-2 text-sm sm:max-w-sm">
              <div className="flex justify-between gap-4 text-slate-600"><span>সর্বমোট</span><span>{formatMoneyWithSymbol(bill.grossAmount)}</span></div>
              <div className="flex justify-between gap-4 text-emerald-700"><span>জমা হয়েছে</span><span>− {formatMoneyWithSymbol(bill.totalPaid)}</span></div>
              <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 text-base font-bold text-slate-900"><span>বাকি</span><span>{formatMoneyWithSymbol(bill.dueAmount)}</span></div>
            </div>
          </div>
          {isAdmitted && (
            <p className="border-t border-slate-100 px-5 py-3 text-xs leading-5 text-slate-500 sm:px-6">
              প্রতি ১২ ঘণ্টা বা তার অংশকে ১টি বেড ব্লক ধরা হয়। “চার্জ আপডেট” চাপলে বর্তমান সময় পর্যন্ত হিসাব হালনাগাদ হবে।
            </p>
          )}
        </section>
      </div>

      {showDischargeConfirm && (
        <ConfirmModal
          title="Discharge করবেন?"
          message="Discharge করলে Bed Charge চূড়ান্ত হয়ে যাবে এবং আর পরিবর্তন করা যাবে না।"
          confirmLabel="হ্যাঁ, Discharge করুন"
          isSubmitting={isDischarging}
          onConfirm={handleDischarge}
          onCancel={() => setShowDischargeConfirm(false)}
        />
      )}
    </DashboardShell>
  );
}
