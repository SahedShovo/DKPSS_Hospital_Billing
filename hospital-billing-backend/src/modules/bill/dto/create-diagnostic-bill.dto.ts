import {
  IsInt, IsEnum, IsNumberString, IsOptional, IsArray, ArrayMinSize, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DiscountMode } from '../../../common/enums/discount-mode.enum';

class DiagnosticItemDto {
  @IsInt()
  testId!: number;

  @IsOptional()
  @IsInt()
  quantity?: number = 1;

  @IsOptional()
  @IsNumberString()
  itemDiscountPercent?: string = '0';
}

export class CreateDiagnosticBillDto {
  @IsInt()
  patientId!: number;

  @IsOptional()
  @IsEnum(DiscountMode)
  discountMode?: DiscountMode = DiscountMode.NONE;

  @IsOptional()
  @IsNumberString()
  discountPercent?: string = '0';

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DiagnosticItemDto)
  items!: DiagnosticItemDto[];
}