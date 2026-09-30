import { Controller, Get, Post, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ShiftService } from './shift.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('shifts')
export class ShiftController {
  constructor(private shiftService: ShiftService) {}

  @Post('open')
  open(@Body() dto: OpenShiftDto, @CurrentUser() user: CurrentUserPayload) {
    return this.shiftService.openShift(user.id, dto);
  }

  @Post('close')
  close(@Body() dto: CloseShiftDto, @CurrentUser() user: CurrentUserPayload) {
    return this.shiftService.closeShift(user.id, dto);
  }

  @Get('my-current')
  myCurrent(@CurrentUser() user: CurrentUserPayload) {
    return this.shiftService.getMyCurrentShift(user.id);
  }

  @Get(':id/summary')
  summary(@Param('id', ParseIntPipe) id: number) {
    return this.shiftService.getSummary(id);
  }
}