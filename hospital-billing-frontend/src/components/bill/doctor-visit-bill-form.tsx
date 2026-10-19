'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { doctorApi } from '@/lib/doctor';
import { billApi, CreateDoctorVisitItemInput } from '@/lib/bill';
import { Doctor } from '@/types/doctor.types';
import { ApiError } from '@/lib/api';
import { formatMoneyWithSymbol } from '@/lib/money';

type VisitType = 'CONSULTANT' | 'DUTY_DOCTOR' | 'SURGEON';
type DiscountMode = 'NONE' | 'BILL' | 'ITEM';

interface LineItem {
  doctorId: string;
  visitType: VisitType;
  unitPrice: string;
  quantity: string;
  itemDiscountAmount: string;
}

function emptyLine(): LineItem {
  return { doctorId: '', visitType: 'CONSULTANT', unitPrice: '', quantity: '1', itemDiscountAmount: '0' };
}

export function DoctorVisitBillForm({ patientId, onBack }: { patientId: number; onBack: () => void }) {
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [discountMode, setDiscountMode] = useState<DiscountMode>('NONE');
  const [billDiscountAmount, setBillDiscountAmount] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    doctorApi.findActive().then(setDoctors).catch(() => setDoctors([]));
  }, []);

  function addLine() {
    setLines([...lines, emptyLine()]);
  }

  function removeLine(index: number) {
    setLines(lines.filter((_, i) => i !== index));
  }

  function updateLine(index: number, field: keyof LineItem, value: string) {
    const next = [...lines];
    next[index] = { ...next[index], [field]: value };
    // BILL mode-এ item-level discount শূন্যই থাকবে (Backend একই নিয়ম enforce করে)
    if (field !== 'itemDiscountAmount' && discountMode === 'BILL') {
      next[index].itemDiscountAmount = '0';
    }
    setLines(next);
  }

  // শুধু preview-র জন্য — চূড়ান্ত হিসাব Backend করবে
  const previewGross = lines.reduce((sum, l) => {
    const price = parseFloat(l.unitPrice) || 0;
    const qty = parseInt(l.quantity, 10) || 0;
    return sum + price * qty;
  }, 0);

  const previewDiscount =
    discountMode === 'BILL'
      ? (parseFloat(billDiscountAmount) || 0)
      : discountMode === 'ITEM'
        ? lines.reduce((sum, l) => {
            return sum + (parseFloat(l.itemDiscountAmount) || 0);
          }, 0)
        : 0;

  const previewNet = previewGross - previewDiscount;

  function handleDiscountModeChange(mode: DiscountMode) {
    setDiscountMode(mode);
    if (mode !== 'BILL') setBillDiscountAmount('0');
    if (mode !== 'ITEM') {
      setLines(lines.map((l) => ({ ...l, itemDiscountAmount: '0' })));
    }
  }

  async function handleSubmit() {
    setError(null);

    if (lines.some((l) => !l.doctorId || !l.unitPrice)) {
      setError('প্রতিটা লাইনে ডাক্তার ও দাম দেওয়া বাধ্যতামূলক');
      return;
    }

    setIsSubmitting(true);
    try {
      const items: CreateDoctorVisitItemInput[] = lines.map((l) => ({
        doctorId: parseInt(l.doctorId, 10),
        visitType: l.visitType,
        unitPrice: l.unitPrice,
        quantity: parseInt(l.quantity, 10) || 1,
        itemDiscountAmount: discountMode === 'ITEM' ? l.itemDiscountAmount : '0',
      }));

      const bill = await billApi.createDoctorVisit({
        patientId,
        discountMode,
        discountAmount: discountMode === 'BILL' ? billDiscountAmount : '0',
        items,
      });

      router.push(`/bills/${bill.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'বিল তৈরি করা যায়নি');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:gap-5">
      <div className="space-y-4 xl:col-span-2">
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-gray-900">Doctor Visit Items</h2>
            <button onClick={onBack} className="text-xs text-gray-500 hover:underline">
              ← ধরন বদলান
            </button>
          </div>

          <div className="space-y-3">
            {lines.map((line, index) => (
              <div key={index} className="grid grid-cols-2 items-end gap-2 border-b border-gray-100 pb-3 sm:grid-cols-2 xl:grid-cols-12">
                <div className="col-span-2 sm:col-span-1 xl:col-span-4">
                  <Select
                    label={index === 0 ? 'ডাক্তার' : undefined}
                    required
                    value={line.doctorId}
                    onChange={(e) => updateLine(index, 'doctorId', e.target.value)}
                  >
                    <option value="">নির্বাচন করুন</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="col-span-2 sm:col-span-1 xl:col-span-3">
                  <Select
                    label={index === 0 ? 'ভিজিটের ধরন' : undefined}
                    value={line.visitType}
                    onChange={(e) => updateLine(index, 'visitType', e.target.value as VisitType)}
                  >
                    <option value="CONSULTANT">Consultant</option>
                    <option value="DUTY_DOCTOR">Duty Doctor</option>
                    <option value="SURGEON">Surgeon</option>
                  </Select>
                </div>
                <div className="col-span-1 sm:col-span-1 xl:col-span-2">
                  <Input
                    label={index === 0 ? 'দাম' : undefined}
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={line.unitPrice}
                    onChange={(e) => updateLine(index, 'unitPrice', e.target.value)}
                  />
                </div>
                <div className="col-span-1 sm:col-span-1 xl:col-span-1">
                  <Input
                    label={index === 0 ? 'সংখ্যা' : undefined}
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                  />
                </div>
                {discountMode === 'ITEM' && (
                  <div className="col-span-1 sm:col-span-1 xl:col-span-1">
                    <Input
                      label={index === 0 ? 'ছাড় (৳)' : undefined}
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.itemDiscountAmount}
                      onChange={(e) => updateLine(index, 'itemDiscountAmount', e.target.value)}
                    />
                  </div>
                )}
                <div className="col-span-1 text-right sm:col-span-1 xl:col-span-1">
                  {lines.length > 1 && (
                    <button
                      onClick={() => removeLine(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button onClick={addLine} className="mt-3 text-xs text-blue-600 hover:underline">
            + আরেকটা লাইন যোগ করুন
          </button>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-medium text-gray-900">ছাড় (Discount)</h2>
          <div className="mb-3 flex gap-2">
            {(['NONE', 'BILL', 'ITEM'] as DiscountMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => handleDiscountModeChange(mode)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  discountMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {mode === 'NONE' ? 'ছাড় নেই' : mode === 'BILL' ? 'পুরো বিলের নির্দিষ্ট টাকা' : 'আইটেমভিত্তিক টাকা'}
              </button>
            ))}
          </div>
          {discountMode === 'BILL' && (
            <div className="max-w-xs">
              <Input
                label="ছাড়ের পরিমাণ (৳)"
                type="number"
                step="0.01"
                min="0"
                value={billDiscountAmount}
                onChange={(e) => setBillDiscountAmount(e.target.value)}
              />
            </div>
          )}
        </Card>
      </div>

      <div>
        <Card className="xl:sticky xl:top-4">
          <h2 className="mb-3 text-sm font-medium text-gray-900">সারাংশ (প্রাথমিক হিসাব)</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">মোট (Gross)</span>
              <span className="text-gray-900">{formatMoneyWithSymbol(previewGross)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">ছাড়</span>
              <span className="text-red-600">- {formatMoneyWithSymbol(previewDiscount)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold">
              <span className="text-gray-900">নেট (Net)</span>
              <span className="text-gray-900">{formatMoneyWithSymbol(previewNet)}</span>
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-400">
            * এটা প্রাথমিক হিসাব। চূড়ান্ত হিসাব Server থেকে confirm হবে।
          </p>

          {error && <div className="mt-3"><Alert message={error} /></div>}

          <Button className="mt-4 w-full" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'তৈরি হচ্ছে...' : 'বিল তৈরি করুন'}
          </Button>
        </Card>
      </div>
    </div>
  );
}
