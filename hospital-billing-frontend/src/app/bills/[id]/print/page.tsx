'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { AuthGuard } from '@/components/auth-guard';
import { billApi } from '@/lib/bill';
import { Bill } from '@/types/bill.types';
import { Patient } from '@/types/patient.types';
import { Payment } from '@/types/payment.types';
import { ApiError } from '@/lib/api';
import { formatMoneyWithSymbol } from '@/lib/money';

export default function BillPrintPage() {
  const params = useParams();
  const billId = Number(params.id);

  const [bill, setBill] = useState<Bill | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const billData = await billApi.findOne(billId);
      const patientData = billData.patient;
      if (!patientData) throw new ApiError(404, 'Patient not found');
      setBill(billData);
      setPatient(patientData);
      setPayments(billData.payments ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Bill not found');
    } finally {
      setIsLoading(false);
    }
  }, [billId]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) {
    return <div className="p-8 text-sm text-gray-500">Loading...</div>;
  }

  if (error || !bill || !patient) {
    return <div className="p-8 text-sm text-red-600">{error ?? 'Bill not found'}</div>;
  }

  const lastPaymentDate = payments.length > 0
    ? new Date(payments[payments.length - 1].paidAt).toLocaleDateString('en-GB')
    : null;
  const billTypeLabel = bill.billType === 'DOCTOR_VISIT' ? 'Doctor Visit'
    : bill.billType === 'DIAGNOSTIC' ? 'Diagnostic'
      : bill.billType === 'PACKAGE' ? 'Package'
        : bill.billType === 'EMERGENCY' ? 'Emergency'
          : bill.billType === 'MEDICINE' ? 'Medicine'
            : 'Admission';
  const billDate = new Date(bill.createdAt).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="no-print mx-auto mb-4 flex max-w-[210mm] justify-end gap-2 px-4">
          <button
            onClick={() => window.print()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            🖨️ Print Invoice
          </button>
          <button
            onClick={() => window.close()}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        <div
          id="print-area"
          className="mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white p-4 text-black shadow-lg sm:p-[15mm]"
        >
          <div className="mb-6 flex flex-col items-start justify-between gap-3 border-b-2 border-gray-800 pb-4 sm:flex-row">
            <div className="max-w-[65%]">
              <h1 className="text-xl font-bold sm:text-2xl">Dakhin Khan Paribaric Shastha Seba Hospital (Pvt.)</h1>
              <p className="mt-1 text-xs text-gray-700">Address: 2620, Tamizuddin Road, Noapara, Amtola, Dakshinkhan, Dhaka-1230</p>
              <p className="text-xs text-gray-700">Phone: 01971385051, 01911385051</p>
              <p className="text-xs text-gray-700">Email: paribarichospital@gmail.com</p>
            </div>
            <div className="sm:text-right">
              <h2 className="text-lg font-semibold">{billTypeLabel} Invoice</h2>
              <p className="font-mono text-sm">{bill.billNo}</p>
              <p className="text-xs text-gray-600">Date: {billDate}</p>
              {bill.status === 'CANCELLED' && <p className="mt-1 text-sm font-bold text-red-600">*** CANCELLED ***</p>}
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <p><span className="font-medium">Patient Name:</span> {patient.name}</p>
              <p><span className="font-medium">Patient Code:</span> {patient.patientCode}</p>
              <p><span className="font-medium">Age / Gender:</span> {patient.age} years, {patient.gender}</p>
            </div>
            <div>
              <p><span className="font-medium">Phone:</span> {patient.phone}</p>
              <p><span className="font-medium">Address:</span> {patient.address}</p>
              {patient.refer && <p><span className="font-medium">Referred by:</span> {patient.refer}</p>}
            </div>
          </div>

          <table className="mb-6 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-gray-800 text-left">
                <th className="py-2">Description</th>
                <th className="py-2 text-right">Unit Price</th>
                <th className="py-2 text-right">Quantity</th>
                <th className="py-2 text-right">Discount</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {bill.items?.map((item) => (
                <tr key={item.id} className="border-b border-gray-300">
                  <td className="py-2">{item.itemName}</td>
                  <td className="py-2 text-right">{formatMoneyWithSymbol(item.unitPrice)}</td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  <td className="py-2 text-right">{formatMoneyWithSymbol(item.discountAmount)}</td>
                  <td className="py-2 text-right">{formatMoneyWithSymbol(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mb-6 flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between"><span>Gross Amount</span><span>{formatMoneyWithSymbol(bill.grossAmount)}</span></div>
              <div className="flex justify-between"><span>Discount ({bill.discountMode === 'BILL' ? 'নির্দিষ্ট টাকা' : bill.discountMode})</span><span>- {formatMoneyWithSymbol(bill.discountAmount)}</span></div>
              <div className="flex justify-between border-t border-gray-400 pt-1 font-semibold"><span>Net Amount</span><span>{formatMoneyWithSymbol(bill.netAmount)}</span></div>
              <div className="flex justify-between text-green-700"><span>Paid</span><span>{formatMoneyWithSymbol(bill.totalPaid)}</span></div>
              <div className="flex justify-between border-t-2 border-gray-800 pt-1 text-base font-bold"><span>Due</span><span>{formatMoneyWithSymbol(bill.dueAmount)}</span></div>
            </div>
          </div>

          {lastPaymentDate && <p className="mb-6 text-xs text-gray-500">Last Payment Date: {lastPaymentDate}</p>}

          <div className="mt-16 flex justify-between text-sm">
            <div className="text-center"><div className="mb-1 w-40 border-t border-gray-800"></div><p>Patient / Representative Signature</p></div>
            <div className="text-center"><div className="mb-1 w-40 border-t border-gray-800"></div><p>Authorized Signature</p></div>
          </div>

          <p className="mt-8 text-center text-xs text-gray-400">This is a computer-generated receipt. Thank you.</p>
        </div>
      </div>
    </AuthGuard>
  );
}
