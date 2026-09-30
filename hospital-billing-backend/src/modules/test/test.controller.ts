import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { TestService } from './test.service';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { PageQueryDto } from '../../common/dto/page-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('tests')
export class TestController {
  constructor(private testService: TestService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateTestDto, @CurrentUser() user: CurrentUserPayload) {
    return this.testService.create(dto, user.id);
  }

  @Get()
  findAll() {
    return this.testService.findAll();
  }

  @Get('page')
  findPage(@Query() query: PageQueryDto) {
    return this.testService.findPage(query);
  }

  @Get('active')
  findActive() {
    return this.testService.findActive();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.testService.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTestDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.testService.update(id, dto, user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.testService.remove(id);
  }
}
