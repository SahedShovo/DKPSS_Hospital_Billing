import { Module } from '@nestjs/common';
import { ShiftService } from './shift.service';
import { ShiftController } from './shift.controller';

@Module({
  providers: [ShiftService],
  controllers: [ShiftController],
  exports: [ShiftService],
})
export class ShiftModule {}