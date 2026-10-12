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
import {
  LessonsService,
  SignLessonDto,
  UpdateLessonDto,
  LessonQueryFilters,
} from './lessons.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@registro/shared';

@ApiTags('Lessons')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Elenco lezioni svolte per classe o data' })
  async listLessons(
    @CurrentUser('schoolId') schoolId: string,
    @Query() filters: LessonQueryFilters,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.lessonsService.listLessons(schoolId, filters);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Dettagli singola lezione e presenze' })
  async getLesson(
    @CurrentUser('schoolId') schoolId: string,
    @Param('id') id: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.lessonsService.getLesson(schoolId, id);
  }

  @Post('sign')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Firma lezione e registrazione argomento del docente' })
  async signLesson(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') teacherUserId: string,
    @Body() dto: SignLessonDto,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.lessonsService.signLesson(schoolId, teacherUserId, dto);
  }

  @Patch(':id')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Modifica argomento o note della lezione' })
  async updateLesson(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') teacherUserId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLessonDto,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.lessonsService.updateLesson(schoolId, teacherUserId, id, dto);
  }
}
