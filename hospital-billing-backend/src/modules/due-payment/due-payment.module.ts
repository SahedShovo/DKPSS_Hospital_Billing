import { Module } from '@nestjs/common';
import { DuePaymentService } from './due-payment.service';
import { DuePaymentController } from './due-payment.controller';
import { ShiftModule } from '../shift/shift.module';
import { ActiveShiftGuard } from '../../common/guards/active-shift.guard';

@Module({
  imports: [ShiftModule],
  providers: [DuePaymentService, ActiveShiftGuard],
  controllers: [DuePaymentController],
  exports: [DuePaymentService],
})
export class DuePaymentModule {}