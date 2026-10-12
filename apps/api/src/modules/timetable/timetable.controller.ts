import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  TimetableService,
  CreateTimetableSlotDto,
  CreateSubstitutionDto,
} from './timetable.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@registro/shared';

@ApiTags('Timetable')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('timetable')
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Get('classes/:classId')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Orario settimanale della classe' })
  async getClassTimetable(
    @CurrentUser('schoolId') schoolId: string,
    @Param('classId') classId: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.timetableService.getClassTimetable(schoolId, classId);
  }

  @Get('teachers/:teacherUserId')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Orario settimanale del docente' })
  async getTeacherTimetable(
    @CurrentUser('schoolId') schoolId: string,
    @Param('teacherUserId') teacherUserId: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.timetableService.getTeacherTimetable(schoolId, teacherUserId);
  }

  @Post('slots')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Aggiunta slot orario con verifica conflitti docente/classe' })
  async createSlot(
    @CurrentUser('schoolId') schoolId: string,
    @Body() dto: CreateTimetableSlotDto,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.timetableService.createSlot(schoolId, dto);
  }

  @Delete('slots/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Eliminazione slot orario' })
  async deleteSlot(
    @CurrentUser('schoolId') schoolId: string,
    @Param('id') id: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.timetableService.deleteSlot(schoolId, id);
  }

  @Post('substitutions')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Registrazione sostituzione docente' })
  async createSubstitution(
    @CurrentUser('schoolId') schoolId: string,
    @Body() dto: CreateSubstitutionDto,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.timetableService.createSubstitution(schoolId, dto);
  }
}
