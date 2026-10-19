'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { billApi } from '@/lib/bill';
import { ApiError } from '@/lib/api';
import { formatMoneyWithSymbol } from '@/lib/money';

type Kind = 'EMERGENCY' | 'MEDICINE';
type Line = { itemName: string; unitPrice: string; quantity: string; itemDiscountAmount: string };
const emptyLine = (): Line => ({ itemName: '', unitPrice: '', quantity: '1', itemDiscountAmount: '0' });

export function ManualBillForm({ patientId, kind, onBack }: { patientId: number; kind: Kind; onBack: () => void }) {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [discountMode, setDiscountMode] = useState<'NONE' | 'BILL' | 'ITEM'>('NONE');
  const [billDiscount, setBillDiscount] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const title = kind === 'EMERGENCY' ? 'Emergency' : 'Medicine';
  const gross = lines.reduce((sum, line) => sum + (Number(line.unitPrice) || 0) * (Number(line.quantity) || 0), 0);
  const discount = discountMode === 'BILL' ? Number(billDiscount) || 0 : discountMode === 'ITEM'
    ? lines.reduce((sum, line) => sum + (Number(line.itemDiscountAmount) || 0), 0) : 0;

  function update(index: number, field: keyof Line, value: string) {
    setLines((prev) => prev.map((line, i) => i === index ? { ...line, [field]: value } : line));
  }

  async function submit() {
    setError(null);
    if (lines.some((line) => !line.itemName.trim() || !line.unitPrice || Number(line.quantity) < 1)) {
      setError('প্রতিটি আইটেমের নাম, দাম ও সঠিক সংখ্যা দিন');
      return;
    }
    setBusy(true);
    try {
      const input = {
        patientId,
        discountMode,
        discountAmount: discountMode === 'BILL' ? billDiscount : '0',
        items: lines.map((line) => ({ ...line, quantity: Number(line.quantity), itemDiscountAmount: discountMode === 'ITEM' ? line.itemDiscountAmount : '0' })),
      };
      const bill = kind === 'EMERGENCY' ? await billApi.createEmergency(input) : await billApi.createMedicine(input);
      router.push(`/bills/${bill.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'বিল তৈরি করা যায়নি');
    } finally { setBusy(false); }
  }

  return <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:gap-5">
    <Card className="space-y-4 xl:col-span-2">
      <div className="flex items-center justify-between"><h2 className="text-sm font-medium">{title} আইটেম</h2><button onClick={onBack} className="text-xs text-gray-500 hover:underline">← ধরন বদলান</button></div>
      {lines.map((line, index) => <div key={index} className="grid grid-cols-2 gap-3 border-b border-gray-100 pb-3 sm:grid-cols-4">
        <Input label="আইটেমের নাম" required value={line.itemName} onChange={(e) => update(index, 'itemName', e.target.value)} />
        <Input label="দাম (৳)" type="number" min="0" step="0.01" required value={line.unitPrice} onChange={(e) => update(index, 'unitPrice', e.target.value)} />
        <Input label="সংখ্যা" type="number" min="1" step="1" value={line.quantity} onChange={(e) => update(index, 'quantity', e.target.value)} />
        {discountMode === 'ITEM' && <Input label="ছাড় (৳)" type="number" min="0" step="0.01" value={line.itemDiscountAmount} onChange={(e) => update(index, 'itemDiscountAmount', e.target.value)} />}
        {lines.length > 1 && <button className="text-sm text-red-600" onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}>মুছুন</button>}
      </div>)}
      <Button variant="secondary" onClick={() => setLines((prev) => [...prev, emptyLine()])}>+ আইটেম যোগ করুন</Button>
    </Card>
    <Card className="space-y-3 xl:sticky xl:top-4 xl:self-start">
      <h2 className="text-sm font-medium">বিলের সারাংশ</h2>
      <Select label="ছাড়ের ধরন" value={discountMode} onChange={(e) => { const mode = e.target.value as typeof discountMode; setDiscountMode(mode); if (mode !== 'BILL') setBillDiscount('0'); if (mode !== 'ITEM') setLines((prev) => prev.map((line) => ({ ...line, itemDiscountAmount: '0' }))); }}>
        <option value="NONE">ছাড় নেই</option><option value="BILL">পুরো বিলে ছাড়</option><option value="ITEM">আইটেমভিত্তিক ছাড়</option>
      </Select>
      {discountMode === 'BILL' && <Input label="ছাড় (৳)" type="number" min="0" step="0.01" value={billDiscount} onChange={(e) => setBillDiscount(e.target.value)} />}
      <div className="flex justify-between text-sm"><span>মোট</span><span>{formatMoneyWithSymbol(gross.toFixed(2))}</span></div>
      <div className="flex justify-between text-sm"><span>ছাড়</span><span>{formatMoneyWithSymbol(discount.toFixed(2))}</span></div>
      <div className="flex justify-between border-t pt-3 font-semibold"><span>নিট</span><span>{formatMoneyWithSymbol((gross - discount).toFixed(2))}</span></div>
      {error && <Alert message={error} />}
      <Button className="w-full" onClick={submit} disabled={busy}>{busy ? 'তৈরি হচ্ছে...' : `${title} বিল তৈরি করুন`}</Button>
    </Card>
  </div>;
}
