'use client';

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4" aria-live="polite">
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-700">লোড হচ্ছে...</p>
      </div>
    </main>
  );
}
