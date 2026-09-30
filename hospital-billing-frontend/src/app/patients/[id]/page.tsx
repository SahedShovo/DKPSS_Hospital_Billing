'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DuePaymentModal } from '@/components/patient/due-payment-modal';
import { patientApi } from '@/lib/patient';
import { billApi } from '@/lib/bill';
import { duePaymentApi } from '@/lib/due-payment';
import { DuePayment } from '@/lib/due-payment';
import { Patient } from '@/types/patient.types';
import { Bill } from '@/types/bill.types';
import { ApiError } from '@/lib/api';
import { formatMoneyWithSymbol } from '@/lib/money';
import { useToast } from '@/hooks/use-toast';

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const patientId = Number(params.id);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [outstanding, setOutstanding] = useState<string>('0');
  const [showDueModal, setShowDueModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [patientData, billsData, outstandingData] = await Promise.all([
        patientApi.findOne(patientId),
        billApi.findByPatient(patientId),
        duePaymentApi.getOutstanding(patientId),
      ]);
      setPatient(patientData);
      setBills(billsData);
      setOutstanding(outstandingData.outstanding);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'তথ্য লোড করা যায়নি');
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const hasOutstanding = parseFloat(outstanding) > 0;

  function handleDuePaymentSuccess(payment: DuePayment) {
    showToast('Payment নেওয়া হয়েছে');
    void loadData();
    router.push(`/due-payments/receipt/${payment.id}`);
  }

  return (
    <DashboardShell>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{patient.name}</h1>
          <p className="font-mono text-xs text-gray-500">{patient.patientCode}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admissions/new?patientId=${patient.id}`}>
            <Button variant="secondary">+ ভর্তি করুন</Button>
          </Link>
          <Link href={`/bills/new?patientId=${patient.id}`}>
            <Button>+ নতুন বিল</Button>
          </Link>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card>
          <p className="text-xs text-gray-500">বয়স / লিঙ্গ</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {patient.age} বছর, {patient.gender}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500">ফোন</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{patient.phone}</p>
        </Card>
        <Card className={hasOutstanding ? 'border-red-200 bg-red-50' : ''}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-gray-500">মোট বাকি (Outstanding)</p>
              <p className={`mt-1 text-lg font-semibold ${hasOutstanding ? 'text-red-700' : 'text-gray-900'}`}>
                {formatMoneyWithSymbol(outstanding)}
              </p>
            </div>
            {hasOutstanding && (
              <Button variant="secondary" onClick={() => setShowDueModal(true)}>
                জমা নিন
              </Button>
            )}
          </div>
        </Card>
      </div>

      <Card className="mb-5">
        <h2 className="mb-2 text-sm font-medium text-gray-900">ঠিকানা ও রেফার</h2>
        <p className="text-sm text-gray-600">{patient.address}</p>
        {patient.refer && <p className="mt-1 text-sm text-gray-500">রেফার: {patient.refer}</p>}
      </Card>

      <h2 className="mb-3 text-sm font-medium text-gray-900">বিলের তালিকা</h2>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Bill No</th>
              <th className="px-4 py-3">ধরন</th>
              <th className="px-4 py-3">মোট</th>
              <th className="px-4 py-3">জমা</th>
              <th className="px-4 py-3">বাকি</th>
              <th className="px-4 py-3">অবস্থা</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bills.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  কোনো বিল নেই
                </td>
              </tr>
            ) : (
              bills.map((bill) => (
                <tr key={bill.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{bill.billNo}</td>
                  <td className="px-4 py-3 text-gray-600">{bill.billType}</td>
                  <td className="px-4 py-3 text-gray-900">{formatMoneyWithSymbol(bill.netAmount)}</td>
                  <td className="px-4 py-3 text-green-700">{formatMoneyWithSymbol(bill.totalPaid)}</td>
                  <td className="px-4 py-3 text-red-700">{formatMoneyWithSymbol(bill.dueAmount)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        bill.status === 'ACTIVE'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {bill.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/bills/${bill.id}`} className="text-blue-600 hover:underline">
                      দেখুন
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showDueModal && (
        <DuePaymentModal
          patientId={patient.id}
          outstanding={outstanding}
          onClose={() => setShowDueModal(false)}
          onSuccess={handleDuePaymentSuccess}
        />
      )}
    </DashboardShell>
  );
}
