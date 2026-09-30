import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { PatientService } from './patient.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { SearchPatientDto } from './dto/search-patient.dto';
import { PatientPageDto } from './dto/patient-page.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('patients')
export class PatientController {
  constructor(private patientService: PatientService) {}

  @Post()
  create(@Body() dto: CreatePatientDto, @CurrentUser() user: CurrentUserPayload) {
    return this.patientService.create(dto, user.id);
  }

  @Get()
  findAll() {
    return this.patientService.findAll();
  }

  @Get('page')
  findPage(@Query() dto: PatientPageDto) {
    return this.patientService.findPage(dto);
  }

  @Get('search')
  search(@Query() dto: SearchPatientDto) {
    return this.patientService.search(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.patientService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePatientDto) {
    return this.patientService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return this.patientService.remove(id, user.id);
  }
}
