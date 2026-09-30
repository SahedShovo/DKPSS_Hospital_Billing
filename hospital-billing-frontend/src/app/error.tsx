'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-lg font-semibold text-gray-900">কিছু একটা ভুল হয়েছে</h1>
      <p className="max-w-md text-sm text-gray-500">
        অপ্রত্যাশিত একটা সমস্যা হয়েছে। আবার চেষ্টা করুন, সমস্যা থাকলে Admin-কে জানান।
      </p>
      <Button onClick={reset}>আবার চেষ্টা করুন</Button>
    </div>
  );
}