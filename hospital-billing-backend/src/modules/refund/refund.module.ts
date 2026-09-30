import { Module } from '@nestjs/common';
import { RefundService } from './refund.service';
import { RefundController } from './refund.controller';
import { ShiftModule } from '../shift/shift.module';
import { ActiveShiftGuard } from '../../common/guards/active-shift.guard';

@Module({
  imports: [ShiftModule],
  providers: [RefundService, ActiveShiftGuard],
  controllers: [RefundController],
  exports: [RefundService],
})
export class RefundModule {}