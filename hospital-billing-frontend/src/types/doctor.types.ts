export interface Doctor {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateDoctorInput {
  name: string;
}

export interface UpdateDoctorInput {
  name?: string;
  isActive?: boolean;
}