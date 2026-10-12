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
  DisciplinaryNotesService,
  CreateDisciplinaryNoteDto,
} from './disciplinary-notes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@registro/shared';

@ApiTags('Disciplinary Notes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('disciplinary-notes')
export class DisciplinaryNotesController {
  constructor(private readonly notesService: DisciplinaryNotesService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Elenco note disciplinari' })
  async listNotes(
    @CurrentUser('schoolId') schoolId: string,
    @Query('studentProfileId') studentProfileId?: string,
    @Query('classId') classId?: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.notesService.listNotes(schoolId, { studentProfileId, classId });
  }

  @Post()
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Inserimento nota disciplinare' })
  async createNote(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') teacherUserId: string,
    @Body() dto: CreateDisciplinaryNoteDto,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.notesService.createNote(schoolId, teacherUserId, dto);
  }

  @Post(':id/ack')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Presa visione della nota da parte del genitore' })
  async acknowledgeNote(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') parentUserId: string,
    @Param('id') noteId: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.notesService.acknowledgeNote(schoolId, parentUserId, noteId);
  }
}
