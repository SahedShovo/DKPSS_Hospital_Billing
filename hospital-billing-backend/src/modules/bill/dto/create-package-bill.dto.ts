import { IsInt, IsNumberString, IsOptional } from 'class-validator';

export class CreatePackageBillDto {
  @IsInt()
  patientId!: number;

  @IsInt()
  packageId!: number;

  @IsOptional()
  @IsNumberString()
  additionalDiscountAmount?: string = '0';
}
