export interface PackageEntity {
  id: number;
  name: string;
  packagePrice: string | null;
  isActive: boolean;
  createdAt: Date;
  createdBy: number;
}