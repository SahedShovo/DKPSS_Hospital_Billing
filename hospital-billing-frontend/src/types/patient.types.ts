export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface Patient {
  id: number;
  patientCode: string;
  name: string;
  age: string;
  gender: Gender;
  phone: string;
  address: string;
  refer: string;
  createdAt: string;
  createdBy: number;
}

export interface CreatePatientInput {
  name: string;
  age: string;
  gender: Gender;
  phone: string;
  address: string;
  refer?: string;
}
