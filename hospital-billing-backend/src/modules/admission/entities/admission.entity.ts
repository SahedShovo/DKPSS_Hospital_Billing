export interface AdmissionEntity {
  id: number;
  patientId: number;
  billId: number;
  bedType: string;
  bedRate: string;
  admissionFee: string;
  admitTime: Date;
  dischargeTime: Date | null;
  status: string;
  dischargedBy: number | null;
}