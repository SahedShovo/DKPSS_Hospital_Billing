import { IsEnum, IsOptional, IsNumberString } from 'class-validator';
import { DiscountMode } from '../../../common/enums/discount-mode.enum';

export class ApplyDiscountDto {
  @IsEnum(DiscountMode)
  discountMode!: DiscountMode;

  @IsOptional()
  @IsNumberString()
  discountAmount?: string = '0';
}
