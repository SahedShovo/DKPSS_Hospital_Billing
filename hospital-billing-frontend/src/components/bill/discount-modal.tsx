'use client';

import { useState, FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { billApi } from '@/lib/bill';
import { ApiError } from '@/lib/api';

type DiscountMode = 'NONE' | 'BILL' | 'ITEM';

interface DiscountModalProps {
  billId: number;
  currentMode: DiscountMode;
  currentAmount: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function DiscountModal({ billId, currentMode, currentAmount, onClose, onSuccess }: DiscountModalProps) {
  const [mode, setMode] = useState<DiscountMode>(currentMode === 'ITEM' ? 'BILL' : currentMode);
  const [amount, setAmount] = useState(currentAmount);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await billApi.applyDiscount(billId, mode, mode === 'BILL' ? amount : '0');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Discount বদলানো যায়নি');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Discount পরিবর্তন করুন</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('NONE')}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium ${
                mode === 'NONE' ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700'
              }`}
            >
              ছাড় নেই
            </button>
            <button
              type="button"
              onClick={() => setMode('BILL')}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium ${
                mode === 'BILL' ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700'
              }`}
            >
              পুরো বিলের নির্দিষ্ট টাকা
            </button>
          </div>

          {mode === 'BILL' && (
            <Input
              label="ছাড়ের পরিমাণ (৳)"
              type="number"
              step="0.01"
              min="0"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          )}

          <p className="text-xs text-gray-400">
            * Item-wise discount বদলাতে হলে বিলটি বাতিল করে নতুন করে তৈরি করতে হবে।
          </p>

          {error && <Alert message={error} />}

          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              বাতিল
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'অপেক্ষা করুন...' : 'আপডেট করুন'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
