import { Controller, Post, Get, Body, Param, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import { DuePaymentService } from './due-payment.service';
import { CreateDuePaymentDto } from './dto/create-due-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ActiveShiftGuard } from '../../common/guards/active-shift.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CurrentShift } from '../../common/decorators/current-shift.decorator';
import { PageQueryDto } from '../../common/dto/page-query.dto';

@UseGuards(JwtAuthGuard, ActiveShiftGuard)
@Controller('due-payments')
export class DuePaymentController {
  constructor(private duePaymentService: DuePaymentService) {}

  @Post()
  create(
    @Body() dto: CreateDuePaymentDto,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentShift() shift: any,
  ) {
    return this.duePaymentService.create(dto, user.id, shift.id);
  }

  @Get('outstanding-patients')
  findPatientsWithOutstanding(@Query() query: PageQueryDto) {
    return this.duePaymentService.findPatientsWithOutstanding(query);
  }

  @Get('patient/:patientId/outstanding')
  async outstanding(@Param('patientId', ParseIntPipe) patientId: number) {
    const outstanding = await this.duePaymentService.getOutstanding(patientId);
    return { patientId, outstanding: outstanding.toDb() };
  }

  @Get('patient/:patientId')
  findByPatient(@Param('patientId', ParseIntPipe) patientId: number) {
    return this.duePaymentService.findByPatient(patientId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.duePaymentService.findOne(id);
  }
}
