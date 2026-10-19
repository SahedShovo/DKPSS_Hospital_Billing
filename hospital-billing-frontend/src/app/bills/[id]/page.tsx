'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { PaymentModal } from '@/components/bill/payment-modal';
import { RefundModal } from '@/components/bill/refund-modal';
import { DiscountModal } from '@/components/bill/discount-modal';
import { billApi } from '@/lib/bill';
import { Bill } from '@/types/bill.types';
import { Payment, Refund } from '@/types/payment.types';
import { ApiError } from '@/lib/api';
import { formatMoneyWithSymbol } from '@/lib/money';
import { useToast } from '@/hooks/use-toast';

type ModalType = 'payment' | 'refund' | 'discount' | 'cancel' | null;

export default function BillDetailPage() {
  const params = useParams();
  const { showToast } = useToast();
  const billId = Number(params.id);

  const [bill, setBill] = useState<Bill | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [modal, setModal] = useState<ModalType>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const billData = await billApi.findOne(billId);
      setBill(billData);
      setPayments(billData.payments ?? []);
      setRefunds(billData.refunds ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'বিল পাওয়া যায়নি');
    } finally {
      setIsLoading(false);
    }
  }, [billId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCancel() {
    setActionError(null);
    setIsCancelling(true);
    try {
      await billApi.cancel(billId);
      setModal(null);
      showToast('বিল Cancel করা হয়েছে');
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Cancel করা যায়নি');
    } finally {
      setIsCancelling(false);
    }
  }

  if (isLoading) {
    return (
      <DashboardShell>
        <p className="text-sm text-gray-500">লোড হচ্ছে...</p>
      </DashboardShell>
    );
  }

  if (error || !bill) {
    return (
      <DashboardShell>
        <Alert message={error ?? 'বিল পাওয়া যায়নি'} />
      </DashboardShell>
    );
  }

  const isActive = bill.status === 'ACTIVE';
  const hasDue = parseFloat(bill.dueAmount) > 0;
  const hasPaid = parseFloat(bill.totalPaid) > 0;
  const canCancel = isActive && !hasPaid; // Backend rule: refund না করলে cancel হবে না
  const billTypeLabel = bill.billType === 'DOCTOR_VISIT'
    ? 'Doctor Visit'
    : bill.billType === 'DIAGNOSTIC'
      ? 'Diagnostic'
      : bill.billType === 'PACKAGE'
        ? 'Package'
        : bill.billType === 'EMERGENCY'
          ? 'Emergency'
          : bill.billType === 'MEDICINE'
            ? 'Medicine'
            : 'Admission';
  const createdAt = new Date(bill.createdAt).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <DashboardShell>
      <div className="bill-detail-page mx-auto max-w-6xl space-y-5 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/bills" className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-teal-800">
            <span aria-hidden="true">←</span> বিল তালিকায় ফিরুন
          </Link>
          <Link
            href={`/bills/${bill.id}/print`}
            target="_blank"
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800"
          >
            <span aria-hidden="true">▧</span> প্রিন্ট / PDF
          </Link>
        </div>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
          <div className="flex flex-col gap-5 border-b border-slate-100 bg-gradient-to-br from-teal-50 via-white to-slate-50 p-5 sm:p-7 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                  {isActive ? 'সক্রিয় বিল' : 'বাতিল বিল'}
                </span>
                <span className="rounded-full border border-teal-200 bg-white/80 px-2.5 py-1 text-xs font-medium text-teal-800">{billTypeLabel}</span>
                <span className="text-xs text-slate-500">তৈরি: {createdAt}</span>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">বিল নম্বর</p>
              <h1 className="mt-1 break-all font-mono text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{bill.billNo}</h1>
              <p className="mt-1 text-xs text-slate-500">রেকর্ড আইডি #{bill.id}</p>
            </div>

            <div className="flex flex-wrap gap-2 lg:max-w-[520px] lg:justify-end">
              {isActive && hasDue && <Button onClick={() => setModal('payment')}>পেমেন্ট নিন</Button>}
              {isActive && hasPaid && <Button variant="secondary" onClick={() => setModal('refund')}>রিফান্ড</Button>}
              {isActive && bill.billType !== 'PACKAGE' && <Button variant="secondary" onClick={() => setModal('discount')}>ছাড় পরিবর্তন</Button>}
              {canCancel && <Button variant="danger" onClick={() => setModal('cancel')}>বিল বাতিল</Button>}
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-xs font-medium text-slate-500">রোগী</p>
              <p className="mt-1 truncate text-base font-semibold text-slate-900">{bill.patient?.name ?? `রোগী #${bill.patientId}`}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                {bill.patient?.patientCode && <span className="font-mono">{bill.patient.patientCode}</span>}
                {bill.patient?.phone && <span>{bill.patient.phone}</span>}
              </div>
            </div>
            <div className="flex items-center sm:justify-end">
              <Link href={`/patients/${bill.patientId}`} className="inline-flex min-h-10 items-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-teal-800 transition hover:border-teal-300 hover:bg-teal-50">
                রোগীর প্রোফাইল দেখুন <span className="ml-2" aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
        </section>

        {actionError && <Alert message={actionError} />}
        {isActive && hasPaid && !canCancel && (
          <Alert type="info" message="এই বিলে টাকা জমা আছে। বাতিল করতে হলে আগে পুরো টাকা Refund করতে হবে।" />
        )}

        <section className="grid gap-4 sm:grid-cols-3">
          <Card className="relative overflow-hidden border-slate-200 p-4 sm:p-5">
            <span className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-md bg-teal-50 text-teal-700" aria-hidden="true">৳</span>
            <p className="text-xs font-medium text-slate-500">নেট বিল</p>
            <p className="mt-2 pr-10 text-xl font-bold text-slate-900 sm:text-2xl">{formatMoneyWithSymbol(bill.netAmount)}</p>
            <p className="mt-1 text-xs text-slate-400">মোট প্রদেয়</p>
          </Card>
          <Card className="relative overflow-hidden border-emerald-200 p-4 sm:p-5">
            <span className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-700" aria-hidden="true">✓</span>
            <p className="text-xs font-medium text-slate-500">জমা হয়েছে</p>
            <p className="mt-2 pr-10 text-xl font-bold text-emerald-700 sm:text-2xl">{formatMoneyWithSymbol(bill.totalPaid)}</p>
            <p className="mt-1 text-xs text-slate-400">মোট পেমেন্ট</p>
          </Card>
          <Card className={`relative overflow-hidden p-4 sm:p-5 ${hasDue ? 'border-amber-200 bg-amber-50/70' : 'border-slate-200'}`}>
            <span className={`absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-md ${hasDue ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`} aria-hidden="true">◷</span>
            <p className="text-xs font-medium text-slate-500">বাকি</p>
            <p className={`mt-2 pr-10 text-xl font-bold sm:text-2xl ${hasDue ? 'text-amber-800' : 'text-slate-700'}`}>{formatMoneyWithSymbol(bill.dueAmount)}</p>
            <p className="mt-1 text-xs text-slate-400">পরিশোধযোগ্য</p>
          </Card>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-semibold text-slate-900">বিলের আইটেম</h2>
              <p className="mt-1 text-xs text-slate-500">{bill.items?.length ?? 0}টি সেবা / চার্জ</p>
            </div>
          </div>
          {bill.items?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="px-5 py-3 sm:px-6">সেবা / আইটেম</th>
                    <th className="px-4 py-3">একক মূল্য</th>
                    <th className="px-4 py-3 text-center">পরিমাণ</th>
                    <th className="px-4 py-3">ছাড়</th>
                    <th className="px-5 py-3 text-right sm:px-6">মোট</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bill.items.map((item) => (
                    <tr key={item.id} className="transition hover:bg-slate-50/70">
                      <td className="px-5 py-3.5 font-medium text-slate-900 sm:px-6">{item.itemName}</td>
                      <td className="px-4 py-3.5 text-slate-600">{formatMoneyWithSymbol(item.unitPrice)}</td>
                      <td className="px-4 py-3.5 text-center text-slate-600">{item.quantity}</td>
                      <td className="px-4 py-3.5 text-rose-700">{formatMoneyWithSymbol(item.discountAmount)}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-900 sm:px-6">{formatMoneyWithSymbol(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="px-5 py-8 text-center text-sm text-slate-500">এই বিলে কোনো আইটেম নেই।</p>}

          <div className="flex justify-end border-t border-slate-100 bg-slate-50/50 px-5 py-5 sm:px-6">
            <div className="w-full space-y-2 text-sm sm:max-w-sm">
              <div className="flex justify-between gap-4 text-slate-600">
                <span>সর্বমোট</span><span>{formatMoneyWithSymbol(bill.grossAmount)}</span>
              </div>
              <div className="flex justify-between gap-4 text-rose-700">
                <span>ছাড়</span><span>− {formatMoneyWithSymbol(bill.discountAmount)}</span>
              </div>
              <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 text-base font-bold text-slate-900">
                <span>নেট বিল</span><span>{formatMoneyWithSymbol(bill.netAmount)}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <Card className="p-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-semibold text-slate-900">পেমেন্ট ইতিহাস</h2>
                <p className="mt-1 text-xs text-slate-500">{payments.length}টি লেনদেন</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-700" aria-hidden="true">৳</span>
            </div>
            {payments.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-400">এখনো কোনো পেমেন্ট নেই</p> : (
              <ul className="divide-y divide-slate-100 px-5">
                {payments.map((payment) => (
                  <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <span className="text-sm text-slate-600">{new Date(payment.paidAt).toLocaleString('en-GB')}</span>
                    <span className="text-sm font-semibold text-emerald-700">+ {formatMoneyWithSymbol(payment.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-semibold text-slate-900">রিফান্ড ইতিহাস</h2>
                <p className="mt-1 text-xs text-slate-500">{refunds.length}টি লেনদেন</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-rose-50 text-rose-700" aria-hidden="true">↗</span>
            </div>
            {refunds.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-400">এখনো কোনো রিফান্ড নেই</p> : (
              <ul className="divide-y divide-slate-100 px-5">
                {refunds.map((refund) => (
                  <li key={refund.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <span className="text-sm text-slate-600">{new Date(refund.refundedAt).toLocaleString('en-GB')}</span>
                    <span className="text-sm font-semibold text-rose-700">− {formatMoneyWithSymbol(refund.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>

      {modal === 'payment' && (
        <PaymentModal
          billId={bill.id}
          dueAmount={bill.dueAmount}
          onClose={() => setModal(null)}
          onSuccess={() => { showToast('Payment নেওয়া হয়েছে'); load(); }}
        />
      )}
      {modal === 'refund' && (
        <RefundModal
          billId={bill.id}
          totalPaid={bill.totalPaid}
          onClose={() => setModal(null)}
          onSuccess={() => { showToast('Refund দেওয়া হয়েছে'); load(); }}
        />
      )}
      {modal === 'discount' && bill.billType !== 'PACKAGE' && (
        <DiscountModal
          billId={bill.id}
          currentMode={bill.discountMode}
          currentAmount={bill.discountAmount}
          onClose={() => setModal(null)}
          onSuccess={() => { showToast('Discount আপডেট হয়েছে'); load(); }}
        />
      )}
      {modal === 'cancel' && (
        <ConfirmModal
          title="বিল Cancel করবেন?"
          message={`বিল ${bill.billNo} বাতিল করা হবে। এই কাজ পূর্বাবস্থায় ফেরানো যাবে না।`}
          confirmLabel="হ্যাঁ, Cancel করুন"
          isSubmitting={isCancelling}
          onConfirm={handleCancel}
          onCancel={() => setModal(null)}
        />
      )}
    </DashboardShell>
  );
}
