import { IsOptional, IsString } from 'class-validator';

export class SearchPatientDto {
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