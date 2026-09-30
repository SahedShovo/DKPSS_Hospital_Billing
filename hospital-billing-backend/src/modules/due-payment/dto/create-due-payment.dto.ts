import { IsInt, IsNumberString } from 'class-validator';

export class CreateDuePaymentDto {
  @IsInt()
  patientId!: number;

  @IsNumberString()
  amount!: string;
}