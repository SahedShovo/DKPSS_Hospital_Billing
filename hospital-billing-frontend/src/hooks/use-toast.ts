'use client';

import { useContext } from 'react';
import { ToastContext } from '@/context/toast-context';

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast অবশ্যই ToastProvider-এর ভেতরে ব্যবহার করতে হবে');
  return ctx;
}