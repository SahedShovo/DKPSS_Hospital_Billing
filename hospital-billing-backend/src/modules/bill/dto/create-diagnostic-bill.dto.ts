import {
  IsInt, IsEnum, IsNumberString, IsOptional, IsArray, ArrayMinSize, ValidateNested, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DiscountMode } from '../../../common/enums/discount-mode.enum';

class DiagnosticItemDto {
  @IsInt()
  testId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number = 1;

  @IsOptional()
  @IsNumberString()
  itemDiscountAmount?: string = '0';
}

export class CreateDiagnosticBillDto {
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
  @Type(() => DiagnosticItemDto)
  items!: DiagnosticItemDto[];
}
