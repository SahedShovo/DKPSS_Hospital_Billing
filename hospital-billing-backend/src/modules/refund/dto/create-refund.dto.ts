import { IsInt, IsNumberString } from 'class-validator';

export class CreateRefundDto {
  @IsInt()
  billId!: number;

  // পজিটিভ সংখ্যা দিবে; সিস্টেম নিজে থেকে negative করে সংরক্ষণ করবে
  @IsNumberString()
  amount!: string;
}