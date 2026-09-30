export type BillType = 'DOCTOR_VISIT' | 'DIAGNOSTIC' | 'ADMISSION' | 'PACKAGE';
export type BillStatus = 'ACTIVE' | 'CANCELLED';
export type DiscountMode = 'NONE' | 'BILL' | 'ITEM';
export type VisitType = 'CONSULTANT' | 'DUTY_DOCTOR' | 'SURGEON';

export interface BillItem {
  id: number;
  billId: number;
  itemType: string;
  itemName: string;
  visitType: VisitType | null;
  doctorId: number | null;
  testId: number | null;
  unitPrice: string;
  quantity: number;
  itemDiscountPercent: string;
  amount: string;
  discountAmount: string;
}

export interface BillPayment {
  id: number;
  billId: number;
  receivedBy: number;
  shiftId: number;
  amount: string;
  paidAt: string;
}

export interface BillRefund {
  id: number;
  billId: number;
  refundedBy: number;
  shiftId: number;
  amount: string;
  refundedAt: string;
}

export interface BillPatient {
  id: number;
  patientCode: string;
  name: string;
  age: number;
  gender: Gender;
  phone: string;
  address: string;
  refer: string;
  createdAt: string;
  createdBy: number;
}

export interface Bill {
  id: number;
  billNo: string;
  patientId: number;
  billType: BillType;
  discountMode: DiscountMode;
  grossAmount: string;
  discountPercent: string;
  discountAmount: string;
  netAmount: string;
  totalPaid: string;
  dueAmount: string;
  status: BillStatus;
  createdAt: string;
  items?: BillItem[];
  payments?: BillPayment[];
  refunds?: BillRefund[];
  patient?: BillPatient | null;
}
import type { Gender } from './patient.types';
