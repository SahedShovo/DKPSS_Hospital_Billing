export type ItemType =
  | 'DOCTOR_VISIT'
  | 'DIAGNOSTIC'
  | 'ADMISSION_FEE'
  | 'BED'
  | 'OT'
  | 'MEDICINE'
  | 'OTHER';

export interface PackageItem {
  id: number;
  packageId: number;
  itemType: ItemType;
  itemName: string;
  amount: string;
}

export interface Package {
  id: number;
  name: string;
  packagePrice: string | null;
  packageDiscountAmount: string;
  basePrice?: string;
  isActive: boolean;
  items?: PackageItem[]; // findAll (list) এ আসে না, শুধু findOne (detail) এ আসে
  effectivePrice?: string; // discount বাদ দেওয়ার পরের দাম
}

export interface CreatePackageItemInput {
  itemType: ItemType;
  itemName: string;
  amount: string;
}

export interface CreatePackageInput {
  name: string;
  packagePrice?: string;
  packageDiscountAmount?: string;
  items: CreatePackageItemInput[];
}
