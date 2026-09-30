export interface PatientEntity {
  id: number;
  patientCode: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  address: string;
  refer: string;
  createdAt: Date;
  createdBy: number;
}