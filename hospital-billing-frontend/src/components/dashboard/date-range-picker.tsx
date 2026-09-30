'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface DateRangePickerProps {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onApply: () => void;
  onPreset: (preset: 'today' | 'week' | 'month') => void;
  activePreset: 'today' | 'week' | 'month' | null;
}

export function DateRangePicker({ from, to, onFromChange, onToChange, onApply, onPreset, activePreset }: DateRangePickerProps) {
  const presetClass = (preset: 'today' | 'week' | 'month') =>
    `rounded px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-teal-600 ${
      activePreset === preset
        ? 'bg-white text-teal-800 shadow-sm'
        : 'text-slate-600 hover:bg-white hover:text-teal-800'
    }`;

  return (
    <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <Input label="শুরুর তারিখ" type="date" value={from} onChange={(e) => onFromChange(e.target.value)} className="min-h-11" />
          </div>
          <div className="min-w-0">
            <Input label="শেষ তারিখ" type="date" value={to} onChange={(e) => onToChange(e.target.value)} className="min-h-11" />
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid min-h-11 grid-cols-3 gap-1 rounded-md bg-slate-100 p-1">
        <button
          onClick={() => onPreset('today')}
              className={presetClass('today')}
              aria-pressed={activePreset === 'today'}
        >
          আজ
        </button>
        <button
          onClick={() => onPreset('week')}
              className={presetClass('week')}
              aria-pressed={activePreset === 'week'}
        >
          এই সপ্তাহ
        </button>
        <button
          onClick={() => onPreset('month')}
              className={presetClass('month')}
              aria-pressed={activePreset === 'month'}
        >
          এই মাস
        </button>
          </div>
          <Button onClick={onApply} className="min-h-11 min-w-28">
            দেখুন
          </Button>
        </div>
      </div>
    </section>
  );
}
