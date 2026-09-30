import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { ShiftModule } from '../shift/shift.module';
import { ActiveShiftGuard } from '../../common/guards/active-shift.guard';

@Module({
  imports: [ShiftModule],
  providers: [PaymentService, ActiveShiftGuard],
  controllers: [PaymentController],
  exports: [PaymentService],
})
export class PaymentModule {}