import { IsString, IsNumberString, IsDateString, IsOptional } from 'class-validator';

export class UpdateExpenseDto {
  @IsOptional()
  @IsDateString()
  expenseDate?: string;

  @IsOptional()
  @IsString()
  expenseType?: string;

  @IsOptional()
  @IsNumberString()
  amount?: string;

  @IsOptional()
  @IsString()
  description?: string;
}