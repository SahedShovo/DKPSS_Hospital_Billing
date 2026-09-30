import { IsNumberString } from 'class-validator';

export class CloseShiftDto {
  @IsNumberString()
  closingCash!: string;
}