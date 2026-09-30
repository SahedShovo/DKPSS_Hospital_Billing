import { IsInt, IsEnum, IsNumberString, IsOptional, IsDateString } from 'class-validator';
import { BedType } from '../../../common/enums/bed-type.enum';

export class CreateAdmissionDto {
  @IsInt()
  patientId!: number;

  @IsEnum(BedType)
  bedType!: BedType;

  @IsNumberString()
  bedRate!: string;

  @IsNumberString()
  admissionFee!: string;

  // ঐচ্ছিক — না দিলে এখনকার সময়ই admit time হবে (testing-এর সময় past time দিতে পারবে)
  @IsOptional()
  @IsDateString()
  admitTime?: string;
}