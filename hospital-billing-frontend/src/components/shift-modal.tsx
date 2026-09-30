'use client';

import { useState, FormEvent } from 'react';
import { useShift } from '@/hooks/use-shift';
import { ApiError } from '@/lib/api';
import { formatMoneyWithSymbol } from '@/lib/money';

interface ShiftModalProps {
  mode: 'open' | 'close';
  onClose: () => void;
}

export function ShiftModal({ mode, onClose }: ShiftModalProps) {
  const { openShift, closeShift, currentShift } = useShift();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [closedResult, setClosedResult] = useState<{ expectedCash: string; difference: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === 'open') {
        await openShift(amount);
        onClose();
      } else {
        const result = await closeShift(amount);
        setClosedResult({
          expectedCash: result.expectedCash ?? '0',
          difference: result.difference ?? '0',
        });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'কিছু একটা ভুল হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
        {closedResult ? (
          <>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Shift বন্ধ হয়েছে</h2>
            <div className="space-y-2 text-sm text-gray-700">
              <p>প্রত্যাশিত ক্যাশ: <strong>{formatMoneyWithSymbol(closedResult.expectedCash)}</strong></p>
              <p>
                গরমিল:{' '}
                <strong className={parseFloat(closedResult.difference) < 0 ? 'text-red-600' : 'text-green-600'}>
                  {formatMoneyWithSymbol(closedResult.difference)}
                </strong>
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-5 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              ঠিক আছে
            </button>
          </>
        ) : (
          <>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              {mode === 'open' ? 'Shift চালু করুন' : 'Shift বন্ধ করুন'}
            </h2>

            {mode === 'close' && currentShift && (
              <p className="mb-3 text-xs text-gray-500">
                শুরুর ক্যাশ ছিল: {formatMoneyWithSymbol(currentShift.openingCash)}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {mode === 'open' ? 'শুরুর ক্যাশ (Opening Cash)' : 'গণনা করা ক্যাশ (Closing Cash)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {error && (
                <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'অপেক্ষা করুন...' : 'নিশ্চিত করুন'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}