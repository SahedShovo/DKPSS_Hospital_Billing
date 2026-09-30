import { IsInt, IsEnum, IsNumberString, IsOptional } from 'class-validator';
import { BedType } from '../../../common/enums/bed-type.enum';

/**
 * Admission Bill আলাদা — এখানে user কোনো "item list" পাঠায় না।
 * শুধু bed_type, bed_rate, admission_fee দেয়; Admission Fee ও Bed Charge
 * bill_items-এ system নিজে থেকে বসায় (admission.service.ts, Day 6)।
 * তাই এখানে discount_mode/discount_percent ঐচ্ছিক রাখা হলো — শুরুতে discount ছাড়াই
 * bill তৈরি হয়, পরে দরকার হলে PATCH /bills/:id/discount দিয়ে discount বসানো যাবে।
 */
export class CreateAdmissionBillDto {
  @IsInt()
  patientId!: number;

  @IsEnum(BedType)
  bedType!: BedType;

  @IsNumberString()
  bedRate!: string;

  @IsNumberString()
  admissionFee!: string;

  @IsOptional()
  @IsNumberString()
  discountPercent?: string = '0';
}