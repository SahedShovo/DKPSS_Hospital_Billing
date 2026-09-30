export interface Payment {
  id: number;
  billId: number;
  receivedBy: number;
  shiftId: number;
  amount: string;
  paidAt: string;
}

export interface Refund {
  id: number;
  billId: number;
  refundedBy: number;
  shiftId: number;
  amount: string; // negative
  refundedAt: string;
}