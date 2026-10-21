export interface PackageEntity {
  id: number;
  name: string;
  packagePrice: string | null;
  packageDiscountAmount: string;
  isActive: boolean;
  createdAt: Date;
  createdBy: number;
}
