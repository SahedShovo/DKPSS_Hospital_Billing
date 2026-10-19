export interface BillItemEntity {
  id: number;
  billId: number;
  itemType: string;
  itemName: string;
  visitType: string | null;
  doctorId: number | null;
  testId: number | null;
  unitPrice: string;
  quantity: number;
  itemDiscountValue: string;
  itemDiscountPercent: string;
  amount: string;
  discountAmount: string;
}
