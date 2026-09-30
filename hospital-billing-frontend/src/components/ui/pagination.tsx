'use client';

import { Button } from './button';

export function Pagination({ page, pageSize, total, onPageChange, label = 'রেকর্ড' }: {
  page: number; pageSize: number; total: number; onPageChange: (page: number) => void; label?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
      <p className="text-sm text-slate-600">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} / {total} {label}</p>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>আগের পৃষ্ঠা</Button>
        <Button variant="secondary" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>পরের পৃষ্ঠা</Button>
      </div>
    </div>
  );
}
