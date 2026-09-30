export interface LabTest {
  id: number;
  name: string;
  price: string;
  isActive: boolean;
  updatedAt: string;
}

export interface CreateTestInput {
  name: string;
  price: string;
}

export interface UpdateTestInput {
  name?: string;
  price?: string;
  isActive?: boolean;
}