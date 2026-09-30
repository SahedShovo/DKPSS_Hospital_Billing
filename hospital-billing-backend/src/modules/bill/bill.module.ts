import { Module } from '@nestjs/common';
import { BillService } from './bill.service';
import { BillCalculationService } from './bill-calculation.service';
import { BillController } from './bill.controller';

@Module({
  providers: [BillService, BillCalculationService],
  controllers: [BillController],
  exports: [BillService, BillCalculationService],
})
export class BillModule {}