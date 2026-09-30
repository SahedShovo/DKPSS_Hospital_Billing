'use client';

import { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, ApiError } from '@/lib/api';
import { Shift } from '@/types/shift.types';
import { useAuth } from '@/hooks/use-auth';

interface ShiftContextType {
  currentShift: Shift | null;
  isLoading: boolean;
  refreshShift: () => Promise<void>;
  openShift: (openingCash: string) => Promise<void>;
  closeShift: (closingCash: string) => Promise<Shift>;
}

export const ShiftContext = createContext<ShiftContextType | null>(null);

export function ShiftProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshShift = useCallback(async () => {
    if (!user) {
      setCurrentShift(null);
      setIsLoading(false);
      return;
    }
    try {
      const shift = await api.get<Shift>('/shifts/my-current');
      setCurrentShift(shift);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) {
        setCurrentShift(null); // চালু কোনো Shift নেই — এটা error না, স্বাভাবিক অবস্থা
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshShift();
  }, [refreshShift]);

  async function openShift(openingCash: string) {
    const shift = await api.post<Shift>('/shifts/open', { openingCash });
    setCurrentShift(shift);
  }

  async function closeShift(closingCash: string) {
    const shift = await api.post<Shift>('/shifts/close', { closingCash });
    setCurrentShift(null);
    return shift;
  }

  return (
    <ShiftContext.Provider value={{ currentShift, isLoading, refreshShift, openShift, closeShift }}>
      {children}
    </ShiftContext.Provider>
  );
}