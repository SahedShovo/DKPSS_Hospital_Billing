'use client';

import { useEffect, useState, useCallback, FormEvent } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { packageApi } from '@/lib/package';
import { Package, ItemType, CreatePackageItemInput } from '@/types/package.types';
import { ApiError } from '@/lib/api';
import { formatMoneyWithSymbol } from '@/lib/money';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { Search } from 'lucide-react';

const ITEM_TYPES: ItemType[] = ['DOCTOR_VISIT', 'DIAGNOSTIC', 'ADMISSION_FEE', 'BED', 'OT', 'MEDICINE', 'OTHER'];

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const pageSize = 10;
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [name, setName] = useState('');
  const [packagePrice, setPackagePrice] = useState('');
  const [packageDiscountAmount, setPackageDiscountAmount] = useState('0');
  const [items, setItems] = useState<CreatePackageItemInput[]>([
    { itemType: 'DIAGNOSTIC', itemName: '', amount: '' },
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<number | null>(null);
  const [editingPrice, setEditingPrice] = useState('');
  const [editingDiscount, setEditingDiscount] = useState('0');
  const [isSavingPrice, setIsSavingPrice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [packageToDelete, setPackageToDelete] = useState<Package | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const packageItemTotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const packageBasePreview = packagePrice.trim() ? Number(packagePrice) || 0 : packageItemTotal;
  const packageDiscountPreview = Number(packageDiscountAmount) || 0;

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await packageApi.findPage(page, pageSize, searchQuery);
      setPackages(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'লোড করা যায়নি');
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchText.trim().length >= 2 ? searchText.trim() : '');
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchText]);

  function addItemRow() {
    setItems([...items, { itemType: 'DIAGNOSTIC', itemName: '', amount: '' }]);
  }

  function removeItemRow(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItemRow(index: number, field: keyof CreatePackageItemInput, value: string) {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    setItems(next);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await packageApi.create({
        name,
        packagePrice: packagePrice || undefined,
        packageDiscountAmount,
        items,
      });
      setName('');
      setPackagePrice('');
      setPackageDiscountAmount('0');
      setItems([{ itemType: 'DIAGNOSTIC', itemName: '', amount: '' }]);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'তৈরি করা যায়নি');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function savePackagePrice(pkg: Package) {
    setError(null);
    setIsSavingPrice(true);
    try {
      await packageApi.update(pkg.id, {
        packagePrice: editingPrice.trim() || null,
        packageDiscountAmount: editingDiscount.trim() || '0',
      });
      setEditingPackageId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'প্যাকেজের মূল্য পরিবর্তন করা যায়নি');
    } finally {
      setIsSavingPrice(false);
    }
  }

  async function handleDeletePackage() {
    if (!packageToDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      await packageApi.remove(packageToDelete.id);
      setTotal((count) => Math.max(0, count - 1));
      setPackageToDelete(null);
      if (packages.length === 1 && page > 1) setPage((current) => current - 1);
      else await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'প্যাকেজ মুছে ফেলা যায়নি');
      setPackageToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <DashboardShell allowedRoles={['ADMIN']}>
      <header className="mb-7 flex flex-wrap items-center justify-between gap-5 border-b border-slate-200 pb-6">
        <div className="max-w-2xl">
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase text-teal-700">
            <span className="h-1.5 w-6 rounded-full bg-teal-600" aria-hidden="true" />
            ক্যাটালগ ব্যবস্থাপনা
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">প্যাকেজ ব্যবস্থাপনা</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">চিকিৎসা সেবার প্যাকেজ, মূল্য এবং অন্তর্ভুক্ত আইটেম এক জায়গা থেকে পরিচালনা করুন।</p>
      </div>
        <div className="flex min-w-48 items-center gap-3 rounded-lg border border-teal-100 bg-white px-4 py-3 shadow-sm shadow-slate-900/5">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-teal-50 text-2xl text-teal-700" aria-hidden="true">
            ▦
          </span>
          <div>
            <p className="text-xs font-medium text-slate-500">মোট প্যাকেজ</p>
            <p className="mt-0.5 text-xl font-semibold leading-none text-slate-900">{total}</p>
          </div>
        </div>
      </header>

      <section className="mb-8">
        <div className="mb-4 flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-sm font-semibold text-emerald-700" aria-hidden="true">
            +
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900">নতুন প্যাকেজ তৈরি করুন</h2>
            <p className="mt-1 text-sm text-slate-500">প্যাকেজের নাম ও মূল্য নির্ধারণ করে এর সেবাগুলো যোগ করুন।</p>
          </div>
        </div>
        <Card className="p-4 sm:p-6">
          <form onSubmit={handleCreate} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-1">
                <Input
                  label="প্যাকেজের নাম"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="min-h-11"
                />
              </div>
              <div>
                <Input
                  label="মূল প্যাকেজ মূল্য (ঐচ্ছিক)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={packagePrice}
                  onChange={(e) => setPackagePrice(e.target.value)}
                  placeholder="খালি রাখলে আইটেমের যোগফল"
                  className="min-h-11"
                />
                <p className="mt-1.5 text-xs text-slate-500">খালি রাখলে আইটেমের যোগফল মূল মূল্য হবে।</p>
              </div>
              <div>
                <Input
                  label="এই প্যাকেজের discount (৳)"
                  type="number"
                  min="0"
                  step="1"
                  value={packageDiscountAmount}
                  onChange={(e) => setPackageDiscountAmount(e.target.value)}
                  className="min-h-11"
                />
                <p className="mt-1.5 text-xs text-slate-500">শুধু এই প্যাকেজে প্রযোজ্য হবে।</p>
              </div>
            </div>

            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">প্যাকেজের আইটেম</h3>
                  <p className="mt-0.5 text-xs text-slate-500">প্রতিটি সেবা বা চার্জ আলাদা করে যোগ করুন</p>
                </div>
                <span className="text-xs font-medium text-slate-500">{items.length}টি আইটেম</span>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 items-end gap-3 rounded-md border border-slate-200 bg-slate-50/70 p-3 sm:grid-cols-[minmax(150px,0.8fr)_minmax(180px,1.5fr)_minmax(130px,0.8fr)_auto]">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">ধরন</label>
                      <Select
                        aria-label="আইটেমের ধরন"
                        value={item.itemType}
                        onChange={(e) => updateItemRow(index, 'itemType', e.target.value)}
                        className="min-h-11"
                      >
                        {ITEM_TYPES.map((type) => (
                          <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Input
                        label="আইটেমের নাম"
                        placeholder="আইটেমের নাম লিখুন"
                        required
                        value={item.itemName}
                        onChange={(e) => updateItemRow(index, 'itemName', e.target.value)}
                        className="min-h-11"
                      />
                    </div>
                    <div>
                      <Input
                        label="মূল্য (৳)"
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={item.amount}
                        onChange={(e) => updateItemRow(index, 'amount', e.target.value)}
                        placeholder="0.00"
                        className="min-h-11"
                      />
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(index)}
                        aria-label={`${index + 1} নম্বর আইটেম সরান`}
                        className="min-h-11 rounded-md border border-red-200 bg-white px-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
                      >
                        সরান
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addItemRow}
                className="mt-3 inline-flex min-h-10 items-center rounded-md border border-teal-200 bg-teal-50 px-3 text-sm font-medium text-teal-800 transition-colors hover:bg-teal-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              >
                + আইটেম যোগ করুন
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-teal-100 bg-teal-50/70 px-4 py-3 text-sm">
              <span className="text-slate-600">মূল্য {formatMoneyWithSymbol(packageBasePreview)} − ছাড় {formatMoneyWithSymbol(packageDiscountPreview)}</span>
              <span className="font-semibold text-teal-800">ছাড়ের পর {formatMoneyWithSymbol(Math.max(0, packageBasePreview - packageDiscountPreview))}</span>
            </div>

            {error && <Alert message={error} />}

            <div className="flex justify-end border-t border-slate-200 pt-4">
              <Button type="submit" disabled={isSubmitting} className="min-h-11 min-w-44">
                {isSubmitting ? 'তৈরি হচ্ছে...' : 'প্যাকেজ তৈরি করুন'}
              </Button>
            </div>
          </form>
        </Card>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">প্যাকেজ তালিকা</h2>
            <p className="mt-1 text-sm text-slate-500">মূল্য ও অন্তর্ভুক্ত আইটেমসহ সংরক্ষিত প্যাকেজ</p>
          </div>
        </div>

        <div className="mb-4 max-w-xl">
          <Input
            label="প্যাকেজ খুঁজুন"
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Package Name"
            className="min-h-11"
          />
          <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
            <Search size={13} aria-hidden="true" />
            {searchText.trim().length > 0 && searchText.trim().length < 2
              ? 'সাজেশন দেখতে আরও একটি অক্ষর লিখুন'
              : searchQuery
                ? `“${searchQuery}” মিলে এমন প্যাকেজ`
                : 'Package Show'}
          </p>
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-sm text-slate-500">প্যাকেজ লোড হচ্ছে...</div>
        ) : packages.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
            <p className="font-medium text-slate-700">{searchQuery ? 'মিল থাকা প্যাকেজ পাওয়া যায়নি' : 'এখনো কোনো প্যাকেজ তৈরি করা হয়নি'}</p>
            <p className="mt-1 text-sm text-slate-500">{searchQuery ? 'অন্য নাম লিখে খুঁজুন।' : 'উপরের ফর্ম ব্যবহার করে প্রথম প্যাকেজটি তৈরি করুন।'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {packages.map((pkg) => (
              <Card key={pkg.id} className="overflow-hidden p-0">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                  <div className="min-w-0">
                    <p className="mb-1 text-[11px] font-semibold uppercase text-teal-700">প্যাকেজ</p>
                    <h3 className="break-words text-base font-semibold text-slate-900">{pkg.name}</h3>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      pkg.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {pkg.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </span>
                </div>
                <div className="px-5 py-4">
                  <div className="mb-3 flex justify-end">
                    <Button variant="danger" className="min-h-9 px-3 text-xs" onClick={() => setPackageToDelete(pkg)}>
                      প্যাকেজ মুছুন
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500">{pkg.packagePrice ? 'মূল প্যাকেজ মূল্য' : 'আইটেমের মোট মূল্য'}</p>
                  <p className="mt-1 text-lg font-medium text-slate-700">
                    {formatMoneyWithSymbol(pkg.basePrice ?? pkg.packagePrice ?? pkg.effectivePrice ?? '0')}
                  </p>
                  {editingPackageId === pkg.id ? (
                    <div className="mt-3 space-y-2 rounded-md bg-slate-50 p-3">
                      <Input
                        label="প্যাকেজের নির্দিষ্ট মূল্য"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingPrice}
                        onChange={(e) => setEditingPrice(e.target.value)}
                        placeholder="খালি রাখলে আইটেমের যোগফল"
                      />
                      <Input
                        label="এই প্যাকেজের discount (৳)"
                        type="number"
                        min="0"
                        step="1"
                        value={editingDiscount}
                        onChange={(e) => setEditingDiscount(e.target.value)}
                        placeholder="0"
                      />
                      <div className="flex gap-2">
                        <Button className="px-3 py-1.5 text-xs" onClick={() => savePackagePrice(pkg)} disabled={isSavingPrice}>
                          {isSavingPrice ? 'সংরক্ষণ হচ্ছে...' : 'মূল্য সংরক্ষণ'}
                        </Button>
                        <Button className="px-3 py-1.5 text-xs" variant="secondary" onClick={() => setEditingPackageId(null)} disabled={isSavingPrice}>
                          বাতিল
                        </Button>
                      </div>
                      <p className="text-xs text-slate-500">শুধু এই প্যাকেজে discount প্রয়োগ হবে; ছাড় মূল দামের বেশি হতে পারবে না।</p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setEditingPackageId(pkg.id); setEditingPrice(pkg.packagePrice ?? ''); setEditingDiscount(pkg.packageDiscountAmount ?? '0'); }}
                      className="mt-2 text-xs font-medium text-teal-700 hover:underline"
                    >
                      মূল্য / discount পরিবর্তন
                    </button>
                  )}
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-600">অন্তর্ভুক্ত আইটেম</p>
                      <span className="text-xs text-slate-500">{pkg.items?.length ?? 0}টি</span>
                    </div>
                    {(pkg.items ?? []).length > 0 ? (
                      <ul className="divide-y divide-slate-100">
                        {(pkg.items ?? []).map((item) => (
                          <li key={item.id} className="flex items-start justify-between gap-4 py-2 text-sm">
                            <span className="min-w-0 break-words text-slate-700">{item.itemName}</span>
                            <span className="shrink-0 font-medium text-slate-800">{formatMoneyWithSymbol(item.amount)}</span>
                          </li>
                        ))}
                        <li className="flex items-center justify-between gap-4 border-t border-dashed border-slate-200 py-2 text-sm">
                          <span className="font-medium text-rose-700">Discount</span>
                          <span className="shrink-0 font-medium text-rose-700">−{formatMoneyWithSymbol(pkg.packageDiscountAmount ?? '0')}</span>
                        </li>
                        <li className="flex items-center justify-between gap-4 border-t border-slate-200 py-3 text-sm font-semibold">
                          <span className="text-slate-900">মোট মূল্য</span>
                          <span className="shrink-0 text-teal-800">{formatMoneyWithSymbol(pkg.effectivePrice ?? pkg.basePrice ?? pkg.packagePrice ?? '0')}</span>
                        </li>
                      </ul>
                    ) : (
                      <p className="py-2 text-sm text-slate-400">কোনো আইটেম নেই</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
      <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} label="প্যাকেজ" />
      {packageToDelete && (
        <ConfirmModal
          title="প্যাকেজ মুছে ফেলবেন?"
          message={`${packageToDelete.name} এবং এর catalog item মুছে ফেলা হবে। বিলের রেকর্ড থাকলে প্যাকেজটি মুছতে পারবেন না।`}
          confirmLabel="প্যাকেজ মুছুন"
          isSubmitting={isDeleting}
          onConfirm={handleDeletePackage}
          onCancel={() => setPackageToDelete(null)}
        />
      )}
    </DashboardShell>
  );
}
