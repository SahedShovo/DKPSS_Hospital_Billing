'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useShift } from '@/hooks/use-shift';
import { ShiftModal } from '@/components/shift-modal';
import { formatMoneyWithSymbol } from '@/lib/money';

export function Topbar() {
  const { user, logout } = useAuth();
  const { currentShift, isLoading } = useShift();
  const [modalMode, setModalMode] = useState<'open' | 'close' | null>(null);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('hospital-billing-theme');
    document.documentElement.dataset.theme = savedTheme === 'night' ? 'night' : 'day';
  }, []);

  function toggleTheme() {
    const nextTheme = document.documentElement.dataset.theme === 'night' ? 'day' : 'night';
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem('hospital-billing-theme', nextTheme);
  }

  return (
    <header className="flex min-h-20 flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex items-center gap-3 text-sm">
        {!isLoading && (
          <>
            {currentShift ? (
              <>
                <span className="flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Shift চালু — {formatMoneyWithSymbol(currentShift.openingCash)}
                </span>
                <button
                  onClick={() => setModalMode('close')}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                >
                  Shift বন্ধ করুন
                </button>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                  কোনো Shift চালু নেই
                </span>
                <button
                  onClick={() => setModalMode('open')}
                  className="rounded-md bg-teal-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-teal-800"
                >
                  Shift চালু করুন
                </button>
              </>
            )}
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
        <div className="min-w-0 text-right">
          <p className="max-w-56 truncate text-sm font-semibold text-slate-900">{user?.fullName}</p>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-teal-700">{user?.role}</p>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="দিন ও রাতের থিম পরিবর্তন করুন"
          title="দিন/রাত মোড পরিবর্তন করুন"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
        >
          <span className="day-theme-action" aria-hidden="true">☾ Night</span>
          <span className="night-theme-action" aria-hidden="true">☼ Day</span>
        </button>
        <button
          onClick={logout}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
        >
          Logout
        </button>
      </div>

      {modalMode && <ShiftModal mode={modalMode} onClose={() => setModalMode(null)} />}
    </header>
  );
}
