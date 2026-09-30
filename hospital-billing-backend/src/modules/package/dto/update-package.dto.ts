import { IsString, IsBoolean, IsNumberString, IsOptional } from 'class-validator';

export class UpdatePackageDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumberString()
  packagePrice?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
