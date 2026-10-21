import { IsString, IsBoolean, IsNumberString, IsOptional, Matches } from 'class-validator';

export class UpdatePackageDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumberString()
  packagePrice?: string | null;

  @IsOptional()
  @IsNumberString()
  @Matches(/^\d+$/, { message: 'প্যাকেজ discount পূর্ণ সংখ্যায় দিতে হবে' })
  packageDiscountAmount?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
