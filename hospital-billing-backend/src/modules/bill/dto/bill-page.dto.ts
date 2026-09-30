import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { BillType } from '../../../common/enums/bill-type.enum';
import { BillStatus } from '../../../common/enums/bill-status.enum';

export class BillPageDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 10;

  @IsOptional()
  @IsEnum(BillType)
  type?: BillType;

  @IsOptional()
  @IsEnum(BillStatus)
  status?: BillStatus;

}
