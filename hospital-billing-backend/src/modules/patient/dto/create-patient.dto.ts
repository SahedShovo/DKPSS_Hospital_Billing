import { IsString, IsInt, IsEnum, Min, Max, IsOptional } from 'class-validator';
import { Gender } from '../../../common/enums/gender.enum';

export class CreatePatientDto {
  @IsString()
  name!: string;

  @IsInt()
  @Min(0)
  @Max(150)
  age!: number;

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