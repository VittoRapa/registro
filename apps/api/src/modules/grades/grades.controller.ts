import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  GradesService,
  CreateGradeDto,
  BulkCreateGradesDto,
  UpdateGradeDto,
  GradeQueryFilters,
} from './grades.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@registro/shared';

@ApiTags('Grades')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('grades')
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Elenco voti con filtri per studente, materia o classe' })
  async listGrades(
    @CurrentUser('schoolId') schoolId: string,
    @Query() filters: GradeQueryFilters,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.gradesService.listGrades(schoolId, filters);
  }

  @Post()
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Inserimento singolo voto con tracciamento audit' })
  async createGrade(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') teacherUserId: string,
    @Body() dto: CreateGradeDto,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.gradesService.createGrade(schoolId, teacherUserId, dto);
  }

  @Post('bulk')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Inserimento massivo voti per verifica di classe' })
  async createBulkGrades(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') teacherUserId: string,
    @Body() dto: BulkCreateGradesDto,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.gradesService.createBulkGrades(schoolId, teacherUserId, dto);
  }

  @Patch(':id')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Correzione voto (con finestra di modifica e audit)' })
  async updateGrade(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') actorUserId: string,
    @CurrentUser('role') actorRole: Role,
    @Param('id') id: string,
    @Body() dto: UpdateGradeDto,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    const isSchoolAdmin = actorRole === Role.SCHOOL_ADMIN || actorRole === Role.SUPER_ADMIN;
    return this.gradesService.updateGrade(schoolId, actorUserId, id, dto, isSchoolAdmin);
  }

  @Delete(':id')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Cancellazione voto (soft-delete con audit log)' })
  async deleteGrade(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') actorUserId: string,
    @CurrentUser('role') actorRole: Role,
    @Param('id') id: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    const isSchoolAdmin = actorRole === Role.SCHOOL_ADMIN || actorRole === Role.SUPER_ADMIN;
    return this.gradesService.deleteGrade(schoolId, actorUserId, id, isSchoolAdmin);
  }

  @Get('students/:studentProfileId/averages')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Calcolo medie aritmetiche e ponderate per materia' })
  async calculateStudentAverages(
    @CurrentUser('schoolId') schoolId: string,
    @Param('studentProfileId') studentProfileId: string,
    @Query('termId') termId?: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.gradesService.calculateStudentAverages(schoolId, studentProfileId, termId);
  }

  @Get('assessments')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Elenco verifiche programmate per classe' })
  async listAssessments(
    @CurrentUser('schoolId') schoolId: string,
    @Query('classId') classId?: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.gradesService.listAssessments(schoolId, classId);
  }
}
