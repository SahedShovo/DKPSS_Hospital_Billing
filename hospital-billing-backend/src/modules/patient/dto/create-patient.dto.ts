import { Transform } from 'class-transformer';
import { IsString, IsEnum, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';
import { Gender } from '../../../common/enums/gender.enum';

export class CreatePatientDto {
  @IsString()
  name!: string;

  @Transform(({ value }) => typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  age!: string;

  @IsEnum(Gender)
  gender!: Gender;

  @IsString()
  phone!: string;

  @IsString()
  address!: string;

  @IsOptional()
  @IsString()
  refer?: string;
}
