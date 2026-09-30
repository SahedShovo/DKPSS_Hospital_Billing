import { IsString, IsNumberString, IsDateString, IsOptional } from 'class-validator';

export class CreateExpenseDto {
  @IsDateString()
  expenseDate!: string;

  @IsString()
  expenseType!: string;

  @IsNumberString()
  amount!: string;

  @IsOptional()
  @IsString()
  description?: string;
}