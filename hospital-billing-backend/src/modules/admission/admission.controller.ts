import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { AdmissionService } from './admission.service';
import { CreateAdmissionDto } from './dto/create-admission.dto';
import { DischargeAdmissionDto } from './dto/discharge-admission.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { PageQueryDto } from '../../common/dto/page-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('admissions')
export class AdmissionController {
  constructor(private admissionService: AdmissionService) {}

  @Post()
  admit(@Body() dto: CreateAdmissionDto, @CurrentUser() user: CurrentUserPayload) {
    return this.admissionService.admitPatient(dto, user.id);
  }

  @Get()
  findAllActive() {
    return this.admissionService.findAllActive();
  }

  @Get('page')
  findActivePage(@Query() query: PageQueryDto) {
    return this.admissionService.findActivePage(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.admissionService.findOne(id);
  }

  @Get('patient/:patientId/active')
  activeForPatient(@Param('patientId', ParseIntPipe) patientId: number) {
    return this.admissionService.getActiveAdmissionForPatient(patientId);
  }

  @Patch(':id/refresh-bed-charge')
  refresh(@Param('id', ParseIntPipe) id: number) {
    return this.admissionService.refreshBedCharge(id);
  }

  @Post(':id/discharge')
  discharge(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DischargeAdmissionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.admissionService.discharge(id, user.id);
  }
}
