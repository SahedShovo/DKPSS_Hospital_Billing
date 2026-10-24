'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { duePaymentApi, DuePayment } from '@/lib/due-payment';
import { ApiError } from '@/lib/api';
import { formatMoneyWithSymbol } from '@/lib/money';

export default function DuePaymentReceiptPage() {
  const params = useParams();
  const receiptId = Number(params.id);
  const [receipt, setReceipt] = useState<DuePayment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isInteger(receiptId) || receiptId <= 0) {
      setError('রসিদ নম্বর সঠিক নয়');
      setIsLoading(false);
      return;
    }
    duePaymentApi.findOne(receiptId)
      .then(setReceipt)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'রসিদ লোড করা যায়নি'))
      .finally(() => setIsLoading(false));
  }, [receiptId]);

  if (isLoading) {
    return <DashboardShell><p className="text-sm text-gray-500">রসিদ লোড হচ্ছে...</p></DashboardShell>;
  }

  if (error || !receipt) {
    return <DashboardShell><Alert message={error ?? 'রসিদ পাওয়া যায়নি'} /></DashboardShell>;
  }

  const paidAt = new Date(receipt.paidAt).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <DashboardShell>
      <div className="mx-auto max-w-2xl pb-8">
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link href={`/patients/${receipt.patientId}`} className="text-sm font-medium text-teal-800 hover:underline">
            ← রোগীর প্রোফাইলে ফিরুন
          </Link>
          <Button onClick={() => window.print()}>রসিদ প্রিন্ট করুন</Button>
        </div>

        <article id="print-area" className="receipt-document overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {(['গ্রাহকের কপি', 'হাসপাতালের কপি'] as const).map((copyLabel) => (
            <section className="receipt-copy" key={copyLabel}>
              <header className="receipt-heading border-b border-teal-700 pb-2 text-center">
                <h1 className="text-base font-bold leading-tight text-slate-900 sm:text-lg">Dakhin Khan Paribaric Shastha Seba Hospital (Pvt.)</h1>
                <p className="mt-1 text-[10px] leading-4 text-slate-600">ঠিকানা: ২৬২০, তমিজউদ্দিন রোড, নোয়াপাড়া, আমতলা, দক্ষিণখান, ঢাকা-১২৩০</p>
                <p className="text-[10px] leading-4 text-slate-600">Address: 2620, Tamizuddin Road, Noapara, Amtola, Dakshinkhan, Dhaka-1230</p>
                <p className="text-[10px] leading-4 text-slate-600">ফোন / Phone: 01971385051, 01911385051 · Email: paribarichospital@gmail.com</p>
              </header>

              <div className="mt-2 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">বকেয়া জমার রসিদ</h2>
                  <p className="text-[10px] text-slate-500">Due Payment Receipt</p>
                </div>
                <span className="rounded border border-slate-300 px-2 py-1 text-[10px] font-semibold text-slate-700">{copyLabel}</span>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 border-y border-dashed border-slate-300 py-2 text-[11px]">
                <p><span className="text-slate-500">রসিদ নম্বর:</span> <strong className="font-mono text-slate-900">DP-{String(receipt.id).padStart(6, '0')}</strong></p>
                <p className="text-right"><span className="text-slate-500">তারিখ:</span> <strong className="text-slate-900">{paidAt}</strong></p>
                <p><span className="text-slate-500">রোগীর নাম:</span> <strong className="text-slate-900">{receipt.patientName ?? `রোগী #${receipt.patientId}`}</strong></p>
                <p className="text-right"><span className="text-slate-500">Patient Code:</span> <strong className="font-mono text-slate-900">{receipt.patientCode ?? '—'}</strong></p>
                <p><span className="text-slate-500">ফোন:</span> <strong className="text-slate-900">{receipt.patientPhone || '—'}</strong></p>
                <p className="text-right"><span className="text-slate-500">গ্রহণ করেছেন:</span> <strong className="text-slate-900">{receipt.receivedByName ?? '—'}</strong></p>
              </div>

              <div className="mt-2 flex items-center justify-between rounded border border-teal-700 px-3 py-2">
                <div>
                  <p className="text-[10px] text-slate-500">জমার বিবরণ</p>
                  <p className="text-xs font-semibold text-slate-800">বকেয়া বিলের জমা</p>
                </div>
                <p className="text-lg font-bold text-slate-900">{formatMoneyWithSymbol(receipt.amount)}</p>
              </div>

              {receipt.allocations && receipt.allocations.length > 0 && (
                <div className="mt-3 rounded border border-slate-200 px-3 py-2">
                  <p className="mb-1 text-[10px] font-semibold text-slate-600">যে বিলগুলোতে জমা সমন্বয় হয়েছে</p>
                  {receipt.allocations.map((item) => (
                    <p key={item.billId} className="flex justify-between gap-3 text-[10px] text-slate-700">
                      <span>{item.billNo}</span>
                      <span>{formatMoneyWithSymbol(item.amount)}</span>
                    </p>
                  ))}
                </div>
              )}

              <div className="mt-5 flex justify-between gap-8 text-center text-[10px] text-slate-600">
                <div className="w-36 border-t border-slate-500 pt-1">গ্রাহকের স্বাক্ষর</div>
                <div className="w-36 border-t border-slate-500 pt-1">অনুমোদিত স্বাক্ষর</div>
              </div>
              <p className="mt-2 text-center text-[9px] text-slate-500">পেমেন্টের জন্য ধন্যবাদ। রসিদটি সংরক্ষণ করুন।</p>
            </section>
          ))}
        </article>
      </div>
    </DashboardShell>
  );
}
