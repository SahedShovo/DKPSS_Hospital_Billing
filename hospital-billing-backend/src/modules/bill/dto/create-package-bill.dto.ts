import { IsInt } from 'class-validator';

export class CreatePackageBillDto {
  @IsInt()
  patientId!: number;

  @IsInt()
  packageId!: number;
}
