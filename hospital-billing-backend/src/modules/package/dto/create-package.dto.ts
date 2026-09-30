import { IsString, IsOptional, IsNumberString, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { PackageItemDto } from './package-item.dto';

export class CreatePackageDto {
  @IsString()
  name!: string;

  // খালি রাখলে দাম = সব item-এর যোগফল থেকে হিসাব হবে (Day 5-এর bill-calculation-এ ব্যবহার হবে)
  @IsOptional()
  @IsNumberString()
  packagePrice?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PackageItemDto)
  items!: PackageItemDto[];
}