export interface PaymentEntity {
  id: number;
  billId: number;
  receivedBy: number;
  shiftId: number;
  duePaymentId: number | null;
  amount: string;
  paidAt: Date;
}
