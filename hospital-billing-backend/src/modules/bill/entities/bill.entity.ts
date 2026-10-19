export interface BillEntity {
  id: number;
  billNo: string;
  patientId: number;
  billType: string;
  discountMode: string;
  grossAmount: string;
  billDiscountValue: string;
  discountPercent: string;
  discountAmount: string;
  netAmount: string;
  totalPaid: string;
  dueAmount: string;
  status: string;
  createdAt: Date;
  createdBy: number;
}
