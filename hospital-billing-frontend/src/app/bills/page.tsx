'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { billApi } from '@/lib/bill';
import { Bill, BillType, BillStatus } from '@/types/bill.types';
import { ApiError } from '@/lib/api';
import { formatMoneyWithSymbol } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useAuth } from '@/hooks/use-auth';
import { Card } from '@/components/ui/card';
import { CalendarRange, Download, FileSpreadsheet, ShieldAlert, Trash2 } from 'lucide-react';

function currentMonthStartValue(): string {
  const now = new Date();
  return localDateValue(new Date(now.getFullYear(), now.getMonth(), 1));
}

function localDateValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function escapeCsvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export default function BillsPage() {
  const pageSize = 10;
  const { user } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [page, setPage] = useState(1);
  const [totalBills, setTotalBills] = useState(0);
  const [typeFilter, setTypeFilter] = useState<BillType | ''>('');
  const [statusFilter, setStatusFilter] = useState<BillStatus | ''>('');
  const [exportStartDate, setExportStartDate] = useState(currentMonthStartValue);
  const [exportEndDate, setExportEndDate] = useState(() => localDateValue(new Date()));
  const [exportCount, setExportCount] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [deleteStartDate, setDeleteStartDate] = useState('');
  const [deleteEndDate, setDeleteEndDate] = useState('');
  const [deleteRangeCount, setDeleteRangeCount] = useState<number | null>(null);
  const [confirmDeleteRange, setConfirmDeleteRange] = useState(false);
  const [isDeletingRange, setIsDeletingRange] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (targetPage: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await billApi.findPage(targetPage, pageSize, typeFilter || undefined, statusFilter || undefined);
      setBills(data.items);
      setTotalBills(data.total);
      setPage(data.page);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'বিলের তালিকা লোড করা যায়নি');
    } finally {
      setIsLoading(false);
    }
  }, [pageSize, typeFilter, statusFilter]);

  useEffect(() => {
    load(page);
  }, [load, page]);

  useEffect(() => {
    if (!exportStartDate || !exportEndDate || exportStartDate > exportEndDate) {
      setExportCount(null);
      return;
    }
    let active = true;
    setExportCount(null);
    const timer = setTimeout(() => {
      billApi.countByDateRange(exportStartDate, exportEndDate)
        .then(({ count }) => { if (active) setExportCount(count); })
        .catch(() => { if (active) setExportCount(null); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [exportStartDate, exportEndDate]);

  useEffect(() => {
    if (!deleteStartDate || !deleteEndDate || deleteStartDate > deleteEndDate) {
      setDeleteRangeCount(null);
      return;
    }
    let active = true;
    setDeleteRangeCount(null);
    const timer = setTimeout(() => {
      billApi.countByDateRange(deleteStartDate, deleteEndDate)
        .then(({ count }) => { if (active) setDeleteRangeCount(count); })
        .catch(() => { if (active) setDeleteRangeCount(null); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [deleteStartDate, deleteEndDate]);

  async function handleDeleteDateRange() {
    setIsDeletingRange(true);
    setError(null);
    setNotice(null);
    try {
      const result = await billApi.deleteByDateRange(deleteStartDate, deleteEndDate);
      setNotice(`${result.deletedCount}টি বিল মুছে ফেলা হয়েছে। অডিট রেকর্ড সংরক্ষিত আছে।`);
      setConfirmDeleteRange(false);
      if (page === 1) await load(1);
      else setPage(1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'বিল মুছে ফেলা যায়নি');
      setConfirmDeleteRange(false);
    } finally {
      setIsDeletingRange(false);
    }
  }

  async function downloadCsvByDateRange() {
    setIsExporting(true);
    setError(null);
    try {
    const exportBills = await billApi.findByDateRange(exportStartDate, exportEndDate);
    const headers = [
      'Bill No', 'Date', 'Type', 'Patient ID', 'Gross Amount', 'Discount Amount',
      'Net Amount', 'Paid Amount', 'Due Amount', 'Status',
    ];
    const rows = exportBills.map((bill) => [
      bill.billNo,
      new Date(bill.createdAt).toLocaleDateString('en-GB'),
      bill.billType,
      bill.patientId,
      bill.grossAmount,
      bill.discountAmount,
      bill.netAmount,
      bill.totalPaid,
      bill.dueAmount,
      bill.status,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsvCell).join(','))
      .join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hospital-bills-${exportStartDate}-to-${exportEndDate}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'CSV ডাউনলোড করা যায়নি');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Billing</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">সব বিলের তালিকা</h1>
          <p className="mt-1 text-sm text-slate-500">বিল দেখুন, রিপোর্ট ডাউনলোড করুন এবং তারিখ অনুযায়ী পরিচালনা করুন।</p>
        </div>
        <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
          {totalBills}টি বিল পাওয়া গেছে
        </div>
      </div>

      <div className={`mb-5 grid gap-4 ${user?.role === 'ADMIN' ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
        <Card className="flex flex-col justify-between gap-5 border-slate-200 bg-white">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 text-teal-800">
                  <FileSpreadsheet size={21} aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">বিল রিপোর্ট ডাউনলোড</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Excel-এ খোলা যাবে এমন CSV ফাইল</p>
                </div>
              </div>
              <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-800">
                {exportCount === null ? 'হিসাব হচ্ছে…' : `${exportCount}টি বিল`}
              </span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
              <div>
                <label htmlFor="bill-export-start" className="mb-1.5 block text-xs font-medium text-slate-600">শুরুর তারিখ</label>
                <input
                  id="bill-export-start"
                  type="date"
                  value={exportStartDate}
                  max={exportEndDate || undefined}
                  onChange={(e) => setExportStartDate(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
                />
              </div>
              <span className="hidden pb-3 text-xs text-slate-400 sm:block">থেকে</span>
              <div>
                <label htmlFor="bill-export-end" className="mb-1.5 block text-xs font-medium text-slate-600">শেষের তারিখ</label>
                <input
                  id="bill-export-end"
                  type="date"
                  value={exportEndDate}
                  min={exportStartDate || undefined}
                  onChange={(e) => setExportEndDate(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
                />
              </div>
            </div>
          </div>
          <Button
            type="button"
            onClick={downloadCsvByDateRange}
            disabled={isLoading || isExporting || exportCount === null || exportCount === 0 || !exportStartDate || !exportEndDate}
            className="inline-flex w-full items-center justify-center gap-2"
          >
            <Download size={16} aria-hidden="true" />
            {isExporting ? 'ডাউনলোড হচ্ছে…' : 'CSV ডাউনলোড করুন'}
          </Button>
        </Card>

        {user?.role === 'ADMIN' && (
          <Card className="flex flex-col justify-between gap-5 border-slate-200 bg-white">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 text-red-700">
                    <Trash2 size={20} aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">তারিখসীমার বিল মুছুন</h2>
                    <p className="mt-0.5 text-xs text-slate-500">এই কাজ ফিরিয়ে আনা যাবে না</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                  <ShieldAlert size={13} aria-hidden="true" /> Admin
                </span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                <div>
                  <label htmlFor="bill-delete-start" className="mb-1.5 block text-xs font-medium text-slate-600">শুরুর তারিখ</label>
                  <input
                    id="bill-delete-start"
                    type="date"
                    value={deleteStartDate}
                    max={deleteEndDate || undefined}
                    onChange={(e) => setDeleteStartDate(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                  />
                </div>
                <span className="hidden pb-3 text-xs text-slate-400 sm:block">থেকে</span>
                <div>
                  <label htmlFor="bill-delete-end" className="mb-1.5 block text-xs font-medium text-slate-600">শেষের তারিখ</label>
                  <input
                    id="bill-delete-end"
                    type="date"
                    value={deleteEndDate}
                    min={deleteStartDate || undefined}
                    onChange={(e) => setDeleteEndDate(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                  />
                </div>
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-md border border-red-100 bg-white/80 px-3 py-2.5 text-xs leading-5 text-red-800">
                <CalendarRange className="mt-0.5 shrink-0" size={15} aria-hidden="true" />
                <p>পেমেন্ট, রিফান্ড, ভর্তি বা পুরোনো বাকি যুক্ত থাকলে নিরাপত্তার জন্য কোনো বিল মুছবে না। মুছে ফেলার অডিট রেকর্ড থাকবে।</p>
              </div>
            </div>
            <Button
              type="button"
              variant="danger"
              onClick={() => setConfirmDeleteRange(true)}
              disabled={!deleteStartDate || !deleteEndDate || deleteRangeCount === null || deleteRangeCount === 0 || isLoading}
              className="inline-flex w-full items-center justify-center gap-2"
            >
              <Trash2 size={16} aria-hidden="true" />
              {deleteRangeCount === null ? 'বিলের সংখ্যা দেখুন' : `${deleteRangeCount}টি বিল মুছুন`}
            </Button>
          </Card>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="w-full sm:w-48">
          <Select
            label="ধরন"
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value as BillType | ''); setPage(1); }}
          >
            <option value="">সব ধরন</option>
            <option value="DOCTOR_VISIT">Doctor Visit</option>
            <option value="DIAGNOSTIC">Diagnostic</option>
            <option value="ADMISSION">Admission</option>
            <option value="PACKAGE">Package</option>
          </Select>
        </div>
        <div className="w-full sm:w-48">
          <Select
            label="অবস্থা"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as BillStatus | ''); setPage(1); }}
          >
            <option value="">সব অবস্থা</option>
            <option value="ACTIVE">Active</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </div>
      </div>

      {error && <div className="mb-4"><Alert message={error} /></div>}
      {notice && <div className="mb-4"><Alert type="success" message={notice} /></div>}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
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
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">লোড হচ্ছে...</td></tr>
            ) : bills.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">কোনো বিল নেই</td></tr>
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
      {totalBills > pageSize && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="text-sm text-slate-600">
            {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, totalBills)} / {totalBills} বিল
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={isLoading || page <= 1} onClick={() => setPage((current) => current - 1)}>আগের</Button>
            <Button variant="secondary" disabled={isLoading || page * pageSize >= totalBills} onClick={() => setPage((current) => current + 1)}>পরের</Button>
          </div>
        </div>
      )}
      {confirmDeleteRange && (
        <ConfirmModal
          title="তারিখসীমার সব বিল স্থায়ীভাবে মুছবেন?"
          message={`${deleteStartDate} থেকে ${deleteEndDate} পর্যন্ত ${deleteRangeCount ?? 0}টি বিল মুছে যাবে। এই কাজ ফিরিয়ে আনা যাবে না। পেমেন্ট, রিফান্ড বা ভর্তি যুক্ত কোনো বিল থাকলে সার্ভার পুরো অপারেশন বাতিল করবে।`}
          confirmLabel="সব বিল মুছুন"
          isSubmitting={isDeletingRange}
          onConfirm={handleDeleteDateRange}
          onCancel={() => setConfirmDeleteRange(false)}
        />
      )}
    </DashboardShell>
  );
}
