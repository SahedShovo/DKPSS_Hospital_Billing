'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { duePaymentApi, DuePayment } from '@/lib/due-payment';
import { ApiError } from '@/lib/api';
import { formatMoney } from '@/lib/money';

export default function DuePaymentReceiptPage() {
  const params = useParams();
  const receiptId = Number(params.id);
  const [receipt, setReceipt] = useState<DuePayment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isInteger(receiptId) || receiptId <= 0) {
      setError('Invalid receipt number');
      setIsLoading(false);
      return;
    }
    duePaymentApi.findOne(receiptId)
      .then(setReceipt)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Unable to load receipt'))
      .finally(() => setIsLoading(false));
  }, [receiptId]);

  if (isLoading) {
    return <DashboardShell><p className="text-sm text-gray-500">Loading receipt...</p></DashboardShell>;
  }

  if (error || !receipt) {
    return <DashboardShell><Alert message={error ?? 'Receipt not found'} /></DashboardShell>;
  }

  const paidAt = new Date(receipt.paidAt).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <DashboardShell>
      <div className="mx-auto max-w-2xl pb-8">
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link href={`/patients/${receipt.patientId}`} className="text-sm font-medium text-teal-800 hover:underline">
            ← Back to patient profile
          </Link>
          <Button onClick={() => window.print()}>Print receipt</Button>
        </div>

        <article id="print-area" className="receipt-document overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {(['Patient Copy', 'Hospital Copy'] as const).map((copyLabel) => (
            <section className="receipt-copy" key={copyLabel}>
              <header className="receipt-heading pb-2 text-center">
                <h1 className="text-base font-bold leading-tight text-slate-900 sm:text-lg">Dakhin Khan Paribaric Shastha Seba Hospital (Pvt.)</h1>
                <p className="mt-1 text-[10px] leading-4 text-slate-600">Address: 2620, Tamizuddin Road, Noapara, Amtola, Dakshinkhan, Dhaka-1230</p>
                <p className="text-[10px] leading-4 text-slate-600">Phone: 01971385051, 01911385051 · Email: paribarichospital@gmail.com</p>
              </header>

              <div className="receipt-title flex items-center justify-center gap-2 text-center">
                <h2 className="text-sm font-bold text-slate-900">Due Payment Receipt</h2>
                <span className="rounded border border-teal-700 px-2 py-0.5 text-[10px] font-semibold text-teal-800">{copyLabel}</span>
              </div>

              <div className="receipt-meta grid grid-cols-2 gap-x-3 gap-y-1 py-2 text-center text-[11px]">
                <p><span className="text-slate-500">Receipt No:</span> <strong className="font-mono text-slate-900">DP-{String(receipt.id).padStart(6, '0')}</strong></p>
                <p><span className="text-slate-500">Date:</span> <strong className="text-slate-900">{paidAt}</strong></p>
                <p><span className="text-slate-500">Patient Name:</span> <strong className="text-slate-900">{receipt.patientName ?? `Patient #${receipt.patientId}`}</strong></p>
                <p><span className="text-slate-500">Patient Code:</span> <strong className="font-mono text-slate-900">{receipt.patientCode ?? '—'}</strong></p>
                <p><span className="text-slate-500">Phone:</span> <strong className="text-slate-900">{receipt.patientPhone || '—'}</strong></p>
                <p><span className="text-slate-500">Received By:</span> <strong className="text-slate-900">{receipt.receivedByName ?? '—'}</strong></p>
              </div>

              <div className="receipt-payment text-center">
                <p className="text-[10px] text-slate-600">Payment Against Outstanding Balance</p>
                <p className="receipt-total text-base font-bold text-slate-900">BDT {formatMoney(receipt.amount)}</p>
                {receipt.allocations && receipt.allocations.length > 0 && (
                  <div className="receipt-allocations text-center">
                    <p className="text-[10px] font-semibold text-slate-600">Bills Paid</p>
                    {receipt.allocations.map((item) => (
                      <p key={item.billId} className="text-[9px] text-slate-700">
                        {item.billNo}: BDT {formatMoney(item.amount)}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <div className="receipt-signatures mt-5 flex justify-center gap-8 text-center text-[10px] text-slate-600">
                <div className="w-36 pt-1">Patient Signature</div>
                <div className="w-36 pt-1">Authorized Signature</div>
              </div>
              <p className="receipt-footer mt-2 text-center text-[9px] text-slate-500">Thank you for your payment. Please keep this receipt.</p>
            </section>
          ))}
        </article>
      </div>
    </DashboardShell>
  );
}
