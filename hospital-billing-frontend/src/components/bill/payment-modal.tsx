'use client';

import { useState, FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { paymentApi } from '@/lib/payment';
import { ApiError } from '@/lib/api';
import { formatMoneyWithSymbol } from '@/lib/money';

interface PaymentModalProps {
  billId: number;
  dueAmount: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function PaymentModal({ billId, dueAmount, onClose, onSuccess }: PaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await paymentApi.create(billId, amount);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Payment নেওয়া যায়নি');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Payment নিন</h2>
        <p className="mb-4 text-xs text-gray-500">বাকি আছে: {formatMoneyWithSymbol(dueAmount)}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="জমার পরিমাণ"
            type="number"
            step="0.01"
            min="0.01"
            max={dueAmount}
            required
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          {error && <Alert message={error} />}

          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              বাতিল
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'অপেক্ষা করুন...' : 'জমা নিন'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}