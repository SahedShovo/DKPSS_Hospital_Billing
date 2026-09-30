import { Controller, Post, Get, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ActiveShiftGuard } from '../../common/guards/active-shift.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CurrentShift } from '../../common/decorators/current-shift.decorator';

@UseGuards(JwtAuthGuard, ActiveShiftGuard)
@Controller('payments')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post()
  create(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentShift() shift: any,
  ) {
    return this.paymentService.create(dto, user.id, shift.id);
  }

  @Get('bill/:billId')
  findByBill(@Param('billId', ParseIntPipe) billId: number) {
    return this.paymentService.findByBill(billId);
  }
}