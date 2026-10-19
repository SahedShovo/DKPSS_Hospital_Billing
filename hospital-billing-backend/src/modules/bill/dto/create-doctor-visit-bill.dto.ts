import {
  IsInt, IsEnum, IsNumberString, IsOptional, IsArray, ArrayMinSize, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DiscountMode } from '../../../common/enums/discount-mode.enum';
import { VisitType } from '../../../common/enums/visit-type.enum';

class DoctorVisitItemDto {
  @IsInt()
  doctorId!: number;

  @IsEnum(VisitType)
  visitType!: VisitType;

  @IsNumberString()
  unitPrice!: string;

  @IsOptional()
  @IsInt()
  quantity?: number = 1;

  @IsOptional()
  @IsNumberString()
  itemDiscountAmount?: string = '0';
}

export class CreateDoctorVisitBillDto {
  @IsInt()
  patientId!: number;

  @IsOptional()
  @IsEnum(DiscountMode)
  discountMode?: DiscountMode = DiscountMode.NONE;

  @IsOptional()
  @IsNumberString()
  discountAmount?: string = '0';

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DoctorVisitItemDto)
  items!: DoctorVisitItemDto[];
}
