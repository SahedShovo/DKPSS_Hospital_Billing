import { Transform } from 'class-transformer';
import { IsString, IsEnum, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';
import { Gender } from '../../../common/enums/gender.enum';

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  age?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  refer?: string;
}
