export type BedType = 'GENERAL' | 'WARD' | 'VIP_CABIN';
export type AdmissionStatus = 'ADMITTED' | 'DISCHARGED';

export interface Admission {
  id: number;
  patientId: number;
  patientName?: string;
  patientCode?: string;
  billId: number;
  bedType: BedType;
  bedRate: string;
  admissionFee: string;
  admitTime: string;
  dischargeTime: string | null;
  status: AdmissionStatus;
  dischargedBy: number | null;
  bill?: {
    id: number;
    billNo: string;
    grossAmount: string;
    netAmount: string;
    totalPaid: string;
    dueAmount: string;
  };
}

export interface CreateAdmissionInput {
  patientId: number;
  bedType: BedType;
  bedRate: string;
  admissionFee: string;
  admitTime?: string;
}
