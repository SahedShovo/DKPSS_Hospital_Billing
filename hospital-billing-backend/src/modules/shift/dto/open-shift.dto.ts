import { IsNumberString } from 'class-validator';

export class OpenShiftDto {
  @IsNumberString()
  openingCash!: string;
}