import { IsOptional, IsString } from 'class-validator';

// পুরোপুরি কার্যকর হবে Day 7-এ (Refund-এর সাথে সংযুক্ত)
export class CancelBillDto {
  @IsOptional()
  @IsString()
  reason?: string;
}