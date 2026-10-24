'use client';

import { useState, FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { duePaymentApi } from '@/lib/due-payment';
import { DuePayment } from '@/lib/due-payment';
import { ApiError } from '@/lib/api';
import { formatMoneyWithSymbol } from '@/lib/money';

interface DuePaymentModalProps {
  patientId: number;
  outstanding: string;
  onClose: () => void;
  onSuccess: (payment: DuePayment) => void;
}

export function DuePaymentModal({ patientId, outstanding, onClose, onSuccess }: DuePaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const payment = await duePaymentApi.create(patientId, amount);
      onSuccess(payment);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'জমা নেওয়া যায়নি');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">বকেয়া বিলের টাকা জমা নিন</h2>
        <p className="mb-4 text-xs text-gray-500">মোট বাকি: {formatMoneyWithSymbol(outstanding)}</p>
        <p className="mb-3 text-xs text-slate-500">জমার টাকা পুরোনো বকেয়া বিলগুলোতে আগে সমন্বয় হবে।</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="জমার পরিমাণ"
            type="number"
            step="0.01"
            min="0.01"
            max={outstanding}
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
