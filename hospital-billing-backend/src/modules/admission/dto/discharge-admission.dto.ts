import { IsOptional, IsString } from 'class-validator';

export class DischargeAdmissionDto {
  @IsOptional()
  @IsString()
  note?: string;
}