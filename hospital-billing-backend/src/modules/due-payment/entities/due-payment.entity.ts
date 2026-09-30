export interface DuePaymentEntity {
  id: number;
  patientId: number;
  receivedBy: number;
  shiftId: number;
  amount: string;
  paidAt: Date;
}