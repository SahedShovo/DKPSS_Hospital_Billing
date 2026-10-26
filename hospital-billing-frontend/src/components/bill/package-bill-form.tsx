'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { packageApi } from '@/lib/package';
import { billApi } from '@/lib/bill';
import { Package } from '@/types/package.types';
import { ApiError } from '@/lib/api';
import { formatMoneyWithSymbol } from '@/lib/money';

export function PackageBillForm({ patientId, onBack }: { patientId: number; onBack: () => void }) {
  const router = useRouter();
  const [packages, setPackages] = useState<Package[]>([]);
  const [packageId, setPackageId] = useState('');
  const [additionalDiscountAmount, setAdditionalDiscountAmount] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    packageApi.findActive()
      .then(setPackages)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'প্যাকেজ লোড করা যায়নি'))
      .finally(() => setIsLoading(false));
  }, []);

  const selected = packages.find((pkg) => String(pkg.id) === packageId);
  const basePrice = selected?.basePrice ?? selected?.packagePrice ?? selected?.effectivePrice ?? '0';
  const discount = selected?.packageDiscountAmount ?? '0';
  const toCents = (value: string) => {
    const amount = Number(value);
    return Number.isFinite(amount) ? Math.round(amount * 100) : Number.NaN;
  };
  const basePriceCents = toCents(basePrice);
  const packageDiscountCents = toCents(discount);
  const additionalDiscountCents = toCents(additionalDiscountAmount);
  const totalDiscountCents = packageDiscountCents + additionalDiscountCents;
  const maxAdditionalDiscount = Number.isFinite(basePriceCents) && Number.isFinite(packageDiscountCents)
    ? Math.max(0, basePriceCents - packageDiscountCents) / 100
    : 0;
  const discountIsInvalid = !Number.isFinite(additionalDiscountCents)
    || !Number.isFinite(basePriceCents)
    || !Number.isFinite(packageDiscountCents)
    || additionalDiscountCents < 0
    || packageDiscountCents < 0
    || totalDiscountCents > basePriceCents;
  const additionalDiscountNumber = Number.isFinite(additionalDiscountCents) ? additionalDiscountCents / 100 : 0;
  const totalDiscountNumber = Number.isFinite(totalDiscountCents) ? totalDiscountCents / 100 : 0;
  const price = (Math.max(0, basePriceCents - (Number.isFinite(totalDiscountCents) ? totalDiscountCents : 0)) / 100).toFixed(2);

  async function handleSubmit() {
    if (!packageId) {
      setError('একটি প্যাকেজ নির্বাচন করুন');
      return;
    }
    if (discountIsInvalid) {
      setError('প্যাকেজের নির্ধারিত ছাড়সহ মোট ছাড় মূল দামের বেশি হতে পারবে না');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const bill = await billApi.createPackage({
        patientId,
        packageId: Number(packageId),
        additionalDiscountAmount: additionalDiscountAmount.trim() || '0',
      });
      router.push(`/bills/${bill.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'প্যাকেজ বিল তৈরি করা যায়নি');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:gap-5">
      <Card className="space-y-4 xl:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-gray-900">প্যাকেজ নির্বাচন</h2>
          <button onClick={onBack} className="text-xs text-gray-500 hover:underline">← ধরন বদলান</button>
        </div>
        {isLoading ? <p className="text-sm text-gray-500">প্যাকেজ লোড হচ্ছে...</p> : packages.length ? (
          <Select label="সক্রিয় প্যাকেজ" required value={packageId} onChange={(e) => { setPackageId(e.target.value); setAdditionalDiscountAmount('0'); }}>
            <option value="">প্যাকেজ নির্বাচন করুন</option>
            {packages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>{pkg.name} — {formatMoneyWithSymbol(pkg.effectivePrice ?? pkg.basePrice ?? pkg.packagePrice ?? '0')}</option>
            ))}
          </Select>
        ) : <p className="text-sm text-gray-500">কোনো সক্রিয় প্যাকেজ পাওয়া যায়নি।</p>}

        {selected && (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-900">{selected.name}</h3>
              <span className="text-sm font-medium text-slate-600">মূল দাম: {formatMoneyWithSymbol(basePrice)}</span>
            </div>
            <p className="mb-2 text-xs text-slate-500">প্যাকেজে অন্তর্ভুক্ত সেবা</p>
            <ul className="divide-y divide-slate-200">
              {(selected.items ?? []).map((item) => (
                <li key={item.id} className="flex justify-between gap-3 py-2 text-sm">
                  <span className="text-slate-700">{item.itemName}</span>
                  <span className="shrink-0 text-slate-600">{formatMoneyWithSymbol(item.amount)}</span>
                </li>
              ))}
              <li className="flex justify-between gap-3 border-t border-dashed border-slate-300 py-2 text-sm">
                <span className="font-medium text-rose-700">Discount</span>
                <span className="shrink-0 font-medium text-rose-700">−{formatMoneyWithSymbol(discount)}</span>
              </li>
              <li className="flex justify-between gap-3 border-t border-slate-200 py-3 text-sm font-semibold">
                <span className="text-slate-900">মোট মূল্য</span>
                <span className="shrink-0 text-teal-800">{formatMoneyWithSymbol(price)}</span>
              </li>
            </ul>
          </div>
        )}
        {selected && (
          <div className="space-y-1">
            <Input
              label="এই রোগীর জন্য অতিরিক্ত discount (৳)"
              type="number"
              min="0"
              max={maxAdditionalDiscount}
              step="0.01"
              value={additionalDiscountAmount}
              onChange={(e) => setAdditionalDiscountAmount(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              এটি package-এর আগে থেকে থাকা {formatMoneyWithSymbol(discount)} ছাড়ের সঙ্গে যোগ হবে।
            </p>
          </div>
        )}
        <p className="text-xs text-slate-500">প্যাকেজের মূল মূল্য ও নির্ধারিত ছাড় Admin পরিচালনা করেন। রোগীর বিলে অতিরিক্ত ছাড় Admin ও Receptionist দিতে পারবেন।</p>
      </Card>

      <Card className="xl:sticky xl:top-4 xl:self-start">
        <h2 className="mb-3 text-sm font-medium text-gray-900">বিলের সারাংশ</h2>
        <p className="mb-2 text-sm font-medium text-slate-800">{selected?.name ?? 'প্যাকেজ'}</p>
        <div className="space-y-2 border-t border-gray-200 pt-3 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">মূল্য</span><span>{formatMoneyWithSymbol(basePrice)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Package discount</span><span className="text-rose-700">−{formatMoneyWithSymbol(discount)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">অতিরিক্ত discount</span><span className="text-rose-700">−{formatMoneyWithSymbol(additionalDiscountNumber)}</span></div>
          <div className="flex justify-between border-t border-gray-200 pt-2"><span className="text-slate-500">মোট discount</span><span className="text-rose-700">−{formatMoneyWithSymbol(totalDiscountNumber)}</span></div>
          <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold"><span>মোট</span><span>{formatMoneyWithSymbol(price)}</span></div>
        </div>
        {selected && discountIsInvalid && <p className="mt-3 text-sm text-red-600">মোট discount মূল package মূল্যের বেশি হতে পারবে না।</p>}
        {error && <div className="mt-3"><Alert message={error} /></div>}
        <Button className="mt-4 w-full" onClick={handleSubmit} disabled={isSubmitting || isLoading || !selected || discountIsInvalid}>
          {isSubmitting ? 'তৈরি হচ্ছে...' : 'প্যাকেজ বিল তৈরি করুন'}
        </Button>
      </Card>
    </div>
  );
}
