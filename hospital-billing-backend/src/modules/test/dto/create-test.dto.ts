import { IsString, IsNumberString } from 'class-validator';

export class CreateTestDto {
  @IsString()
  name!: string;

  // Money নির্ভুলতার জন্য string হিসেবে নেওয়া হচ্ছে ("600.00")
  @IsNumberString()
  price!: string;
}