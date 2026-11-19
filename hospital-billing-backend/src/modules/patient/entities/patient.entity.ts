export interface PatientEntity {
  id: number;
  patientCode: string;
  name: string;
  age: string;
  gender: string;
  phone: string;
  address: string;
  refer: string;
  createdAt: Date;
  createdBy: number;
}
