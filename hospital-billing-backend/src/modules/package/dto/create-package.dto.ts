import { IsString, IsOptional, IsNumberString, IsArray, ValidateNested, ArrayMinSize, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { PackageItemDto } from './package-item.dto';

export class CreatePackageDto {
  @IsString()
  name!: string;

  // খালি রাখলে দাম = সব item-এর যোগফল থেকে হিসাব হবে (Day 5-এর bill-calculation-এ ব্যবহার হবে)
  @IsOptional()
  @IsNumberString()
  packagePrice?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(/^\d+$/, { message: 'প্যাকেজ discount পূর্ণ সংখ্যায় দিতে হবে' })
  packageDiscountAmount?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PackageItemDto)
  items!: PackageItemDto[];
}
