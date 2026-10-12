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
import { ClassesService, CreateClassDto } from './classes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@registro/shared';

@ApiTags('Classes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('classes')
export class ClassesController {
  constructor(private readonly service: ClassesService) {}

  @Get()
  @ApiOperation({ summary: 'Elenco classi per anno accademico' })
  async list(
    @CurrentUser('schoolId') schoolId: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    if (!schoolId) throw new ForbiddenException('Contesto scuola non specificato');
    return this.service.list(schoolId, academicYearId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Dettaglio classe con docenti e studenti' })
  async get(
    @CurrentUser('schoolId') schoolId: string,
    @Param('id') id: string,
  ) {
    if (!schoolId) throw new ForbiddenException('Contesto scuola non specificato');
    return this.service.get(schoolId, id);
  }

  @Post()
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Crea nuova classe' })
  async create(
    @CurrentUser('schoolId') schoolId: string,
    @Body() dto: CreateClassDto,
  ) {
    if (!schoolId) throw new ForbiddenException('Contesto scuola non specificato');
    return this.service.create(schoolId, dto);
  }

  @Patch(':id')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Modifica dati classe' })
  async update(
    @CurrentUser('schoolId') schoolId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateClassDto>,
  ) {
    if (!schoolId) throw new ForbiddenException('Contesto scuola non specificato');
    return this.service.update(schoolId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Elimina classe' })
  async delete(
    @CurrentUser('schoolId') schoolId: string,
    @Param('id') id: string,
  ) {
    if (!schoolId) throw new ForbiddenException('Contesto scuola non specificato');
    return this.service.delete(schoolId, id);
  }

  @Get(':id/students')
  @ApiOperation({ summary: 'Elenco studenti iscritti alla classe' })
  async listStudents(
    @CurrentUser('schoolId') schoolId: string,
    @Param('id') id: string,
  ) {
    if (!schoolId) throw new ForbiddenException('Contesto scuola non specificato');
    return this.service.listStudents(schoolId, id);
  }

  @Post(':id/students')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Iscrive studente alla classe' })
  async enrollStudent(
    @CurrentUser('schoolId') schoolId: string,
    @Param('id') classId: string,
    @Body('studentProfileId') studentProfileId: string,
  ) {
    if (!schoolId) throw new ForbiddenException('Contesto scuola non specificato');
    return this.service.enrollStudent(schoolId, classId, studentProfileId);
  }

  @Delete(':id/students/:studentProfileId')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Rimuove studente dalla classe' })
  async removeStudent(
    @CurrentUser('schoolId') schoolId: string,
    @Param('id') classId: string,
    @Param('studentProfileId') studentProfileId: string,
  ) {
    if (!schoolId) throw new ForbiddenException('Contesto scuola non specificato');
    return this.service.removeStudent(schoolId, classId, studentProfileId);
  }
}
