import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  AttendanceService,
  BulkAttendanceDto,
  SubmitJustificationDto,
} from './attendance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@registro/shared';
import { JustificationStatus } from '@prisma/client';

@ApiTags('Attendance')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('lessons/:lessonRecordId')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Appello della lezione' })
  async getLessonAttendance(
    @CurrentUser('schoolId') schoolId: string,
    @Param('lessonRecordId') lessonRecordId: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.attendanceService.getLessonAttendance(schoolId, lessonRecordId);
  }

  @Post('lessons/:lessonRecordId/bulk')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Appello rapido di classe (<30 sec)' })
  async recordBulkAttendance(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') teacherUserId: string,
    @Param('lessonRecordId') lessonRecordId: string,
    @Body() dto: BulkAttendanceDto,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.attendanceService.recordBulkAttendance(
      schoolId,
      teacherUserId,
      lessonRecordId,
      dto,
    );
  }

  @Get('students/:studentProfileId')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Storico e statistiche assenze studente' })
  async getStudentAttendanceHistory(
    @CurrentUser('schoolId') schoolId: string,
    @Param('studentProfileId') studentProfileId: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.attendanceService.getStudentAttendanceHistory(schoolId, studentProfileId);
  }

  @Post('justifications')
  @Roles(Role.PARENT, Role.STUDENT, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Invio richiesta giustificazione assenza' })
  async submitJustification(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') submitterUserId: string,
    @Body() dto: SubmitJustificationDto,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.attendanceService.submitJustification(schoolId, submitterUserId, dto);
  }

  @Get('justifications')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Elenco giustificazioni in attesa o per studente' })
  async listJustifications(
    @CurrentUser('schoolId') schoolId: string,
    @Query('status') status?: JustificationStatus,
    @Query('studentProfileId') studentProfileId?: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.attendanceService.listJustifications(schoolId, {
      status,
      studentProfileId,
    });
  }

  @Post('justifications/:id/review')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Approvazione o rifiuto giustificazione' })
  async reviewJustification(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') reviewerUserId: string,
    @Param('id') justificationId: string,
    @Body('status') status: JustificationStatus,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.attendanceService.reviewJustification(
      schoolId,
      reviewerUserId,
      justificationId,
      status,
    );
  }
}
