'use client';

import { useContext } from 'react';
import { ShiftContext } from '@/context/shift-context';

export function useShift() {
  const ctx = useContext(ShiftContext);
  if (!ctx) throw new Error('useShift অবশ্যই ShiftProvider-এর ভেতরে ব্যবহার করতে হবে');
  return ctx;
}