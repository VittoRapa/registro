import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HomeworkService, CreateHomeworkDto } from './homework.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@registro/shared';
import { HomeworkSubmissionStatus } from '@prisma/client';

@ApiTags('Homework')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('homework')
export class HomeworkController {
  constructor(private readonly homeworkService: HomeworkService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Elenco compiti assegnati per classe o scadenza' })
  async listHomework(
    @CurrentUser('schoolId') schoolId: string,
    @Query('classId') classId?: string,
    @Query('dueDate') dueDate?: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.homeworkService.listHomework(schoolId, classId, dueDate);
  }

  @Post()
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Assegnazione compiti per casa' })
  async createHomework(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') teacherUserId: string,
    @Body() dto: CreateHomeworkDto,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.homeworkService.createHomework(schoolId, teacherUserId, dto);
  }

  @Patch(':id/status')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Spunta completamento compito da parte dello studente' })
  async updateStatus(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') studentUserId: string,
    @Param('id') homeworkId: string,
    @Body('status') status: HomeworkSubmissionStatus,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.homeworkService.updateStatus(schoolId, studentUserId, homeworkId, status);
  }
}
