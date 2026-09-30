import { Matches } from 'class-validator';

export class DeleteBillsRangeDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate!: string;
}
