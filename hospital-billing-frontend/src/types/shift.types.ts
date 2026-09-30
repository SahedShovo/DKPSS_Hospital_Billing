export type ShiftStatus = 'OPEN' | 'CLOSED';

export interface Shift {
  id: number;
  userId: number;
  openingCash: string;
  closingCash: string | null;
  expectedCash: string | null;
  difference: string | null;
  status: ShiftStatus;
  startTime: string;
  endTime: string | null;
}

export interface ShiftSummary {
  shiftId: number;
  openingCash: string;
  paymentsTotal: string;
  dueCollected: string;
  refundsTotal: string;
  expectedCash: string;
}