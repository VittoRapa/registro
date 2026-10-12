import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TeachingAssignmentsService, CreateAssignmentDto } from './teaching-assignments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@registro/shared';

@ApiTags('TeachingAssignments')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('teaching-assignments')
export class TeachingAssignmentsController {
  constructor(private readonly service: TeachingAssignmentsService) {}

  @Get()
  @ApiOperation({ summary: 'Elenco assegnazioni docenti per classe e materia' })
  async list(
    @CurrentUser('schoolId') schoolId: string,
    @Query('classId') classId?: string,
    @Query('teacherProfileId') teacherProfileId?: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    if (!schoolId) throw new ForbiddenException('Contesto scuola non specificato');
    return this.service.list(schoolId, { classId, teacherProfileId, academicYearId });
  }

  @Post()
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Assegna docente a una materia in una classe' })
  async create(
    @CurrentUser('schoolId') schoolId: string,
    @Body() dto: CreateAssignmentDto,
  ) {
    if (!schoolId) throw new ForbiddenException('Contesto scuola non specificato');
    return this.service.create(schoolId, dto);
  }

  @Delete(':id')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Rimuove assegnazione docente' })
  async delete(
    @CurrentUser('schoolId') schoolId: string,
    @Param('id') id: string,
  ) {
    if (!schoolId) throw new ForbiddenException('Contesto scuola non specificato');
    return this.service.delete(schoolId, id);
  }
}
