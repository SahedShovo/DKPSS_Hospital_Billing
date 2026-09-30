import { IsString, IsNumberString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateTestDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumberString()
  price?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}