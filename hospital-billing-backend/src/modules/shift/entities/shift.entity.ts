export interface ShiftEntity {
  id: number;
  userId: number;
  openingCash: string;
  closingCash: string | null;
  expectedCash: string | null;
  difference: string | null;
  status: string;
  startTime: Date;
  endTime: Date | null;
}