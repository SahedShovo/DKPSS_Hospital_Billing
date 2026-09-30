export interface UserEntity {
  id: number;
  username: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
}