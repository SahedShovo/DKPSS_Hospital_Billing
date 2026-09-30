export interface RefundEntity {
  id: number;
  billId: number;
  refundedBy: number;
  shiftId: number;
  amount: string; // negative
  refundedAt: Date;
}