export interface PaymentEntity {
  id: number;
  billId: number;
  receivedBy: number;
  shiftId: number;
  amount: string;
  paidAt: Date;
}