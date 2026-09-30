import { IsInt, IsNumberString } from 'class-validator';

export class CreatePaymentDto {
  @IsInt()
  billId!: number;

  @IsNumberString()
  amount!: string;
}