import { Controller, Post, Get, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { RefundService } from './refund.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ActiveShiftGuard } from '../../common/guards/active-shift.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CurrentShift } from '../../common/decorators/current-shift.decorator';

@UseGuards(JwtAuthGuard, ActiveShiftGuard)
@Controller('refunds')
export class RefundController {
  constructor(private refundService: RefundService) {}

  @Post()
  create(
    @Body() dto: CreateRefundDto,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentShift() shift: any,
  ) {
    return this.refundService.create(dto, user.id, shift.id);
  }

  @Get('bill/:billId')
  findByBill(@Param('billId', ParseIntPipe) billId: number) {
    return this.refundService.findByBill(billId);
  }
}