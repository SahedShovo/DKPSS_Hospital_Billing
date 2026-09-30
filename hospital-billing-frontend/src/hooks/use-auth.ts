'use client';

import { useContext } from 'react';
import { AuthContext } from '@/context/auth-context';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth অবশ্যই AuthProvider-এর ভেতরে ব্যবহার করতে হবে');
  return ctx;
}