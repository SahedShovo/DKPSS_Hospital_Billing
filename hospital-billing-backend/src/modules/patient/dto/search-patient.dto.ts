import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SearchPatientDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  query?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  patientCode?: string;
}
