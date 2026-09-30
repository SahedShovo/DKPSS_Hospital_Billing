import { Module } from '@nestjs/common';
import { AdmissionService } from './admission.service';
import { AdmissionController } from './admission.controller';
import { BillModule } from '../bill/bill.module';

@Module({
  imports: [BillModule],
  providers: [AdmissionService],
  controllers: [AdmissionController],
  exports: [AdmissionService],
})
export class AdmissionModule {}