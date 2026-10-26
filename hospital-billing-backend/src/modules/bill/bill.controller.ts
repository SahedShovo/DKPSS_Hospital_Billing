import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import { BillService } from './bill.service';
import { CreateDoctorVisitBillDto } from './dto/create-doctor-visit-bill.dto';
import { CreateDiagnosticBillDto } from './dto/create-diagnostic-bill.dto';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { DeleteBillsRangeDto } from './dto/delete-bills-range.dto';
import { BillPageDto } from './dto/bill-page.dto';
import { CreatePackageBillDto } from './dto/create-package-bill.dto';
import { CreateManualBillDto } from './dto/create-manual-bill.dto';
import { BillType } from '../../common/enums/bill-type.enum';
import { ItemType } from '../../common/enums/item-type.enum';

@UseGuards(JwtAuthGuard)
@Controller('bills')
export class BillController {
  constructor(private billService: BillService) {}

  @Post('doctor-visit')
  createDoctorVisit(@Body() dto: CreateDoctorVisitBillDto, @CurrentUser() user: CurrentUserPayload) {
    return this.billService.createDoctorVisitBill(dto, user.id);
  }

  @Post('diagnostic')
  createDiagnostic(@Body() dto: CreateDiagnosticBillDto, @CurrentUser() user: CurrentUserPayload) {
    return this.billService.createDiagnosticBill(dto, user.id);
  }

  @Post('package')
  createPackage(@Body() dto: CreatePackageBillDto, @CurrentUser() user: CurrentUserPayload) {
    return this.billService.createPackageBill(dto, user.id);
  }

  @Post('emergency')
  createEmergency(@Body() dto: CreateManualBillDto, @CurrentUser() user: CurrentUserPayload) {
    return this.billService.createManualBill(dto, BillType.EMERGENCY, ItemType.EMERGENCY, user.id);
  }

  @Post('medicine')
  createMedicine(@Body() dto: CreateManualBillDto, @CurrentUser() user: CurrentUserPayload) {
    return this.billService.createManualBill(dto, BillType.MEDICINE, ItemType.MEDICINE, user.id);
  }

  @Get()
  findAll() {
    return this.billService.findAll();
  }

  @Get('page')
  findPage(@Query() dto: BillPageDto) {
    return this.billService.findPage(dto);
  }

  @Get('date-range/count')
  countByDateRange(@Query() dto: DeleteBillsRangeDto) {
    return this.billService.countByDateRange(dto);
  }

  @Get('date-range')
  findByDateRange(@Query() dto: DeleteBillsRangeDto) {
    return this.billService.findByDateRange(dto);
  }

  @Get('patient/:patientId')
  findByPatient(@Param('patientId', ParseIntPipe) patientId: number) {
    return this.billService.findByPatient(patientId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('date-range')
  deleteByDateRange(
    @Body() dto: DeleteBillsRangeDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.billService.deleteByDateRange(dto, user.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  deleteOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.billService.deleteOne(id, user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.billService.findOne(id);
  }

  @Patch(':id/discount')
  applyDiscount(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApplyDiscountDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.billService.applyDiscount(id, dto, user.id);
  }

  @Post(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return this.billService.cancelBill(id, user.id);
  }
}
