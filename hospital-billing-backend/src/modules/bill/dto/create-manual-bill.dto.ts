import { IsInt, IsEnum, IsNumberString, IsOptional, IsArray, ArrayMinSize, ValidateNested, IsString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { DiscountMode } from '../../../common/enums/discount-mode.enum';

class ManualBillItemDto {
  @IsString()
  @MinLength(1)
  itemName!: string;

  @IsNumberString()
  unitPrice!: string;

  @IsOptional()
  @IsInt()
  quantity?: number = 1;

  @IsOptional()
  @IsNumberString()
  itemDiscountAmount?: string = '0';
}

export class CreateManualBillDto {
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
  @Type(() => ManualBillItemDto)
  items!: ManualBillItemDto[];
}
