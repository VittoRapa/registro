import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  SharedNotesService,
  SharedNoteFilters,
  CreateSharedNoteDto,
  UpdateSharedNoteDto,
  CreateCommentDto,
  ReportNoteDto,
} from './shared-notes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NoteStatus } from '@prisma/client';
import { Role } from '@registro/shared';

@ApiTags('Shared Notes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class SharedNotesController {
  constructor(private readonly notesService: SharedNotesService) {}

  @Get('shared-notes')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiOperation({ summary: 'Esplora appunti condivisi con filtri e ricerca' })
  async listNotes(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Query() filters: SharedNoteFilters,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.notesService.listNotes(schoolId, userId, role, undefined, undefined, filters);
  }

  @Post('shared-notes')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiOperation({ summary: 'Creazione nuovo appunto (Bozza o Pubblicato)' })
  async createNote(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') authorId: string,
    @CurrentUser('role') role: Role,
    @Body() dto: CreateSharedNoteDto,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.notesService.createNote(schoolId, authorId, role, dto);
  }

  @Get('shared-notes/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiOperation({ summary: 'Dettagli singolo appunto e incremento visualizzazioni' })
  async getNote(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Param('id') id: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.notesService.getNote(schoolId, id, userId, role);
  }

  @Patch('shared-notes/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiOperation({ summary: 'Modifica metadati o contenuto dell\'appunto da parte dell\'autore' })
  async updateNote(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSharedNoteDto,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.notesService.updateNote(schoolId, id, userId, dto);
  }

  @Delete('shared-notes/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiOperation({ summary: 'Eliminazione appunto da parte dell\'autore o moderatore' })
  async deleteNote(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Param('id') id: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    const isModerator = role === Role.SCHOOL_ADMIN || role === Role.SUPER_ADMIN;
    return this.notesService.deleteNote(schoolId, id, userId, isModerator);
  }

  @Post('shared-notes/:id/publish')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiOperation({ summary: 'Pubblicazione esplicita della bozza dell\'appunto' })
  async publishNote(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.notesService.publishNote(schoolId, id, userId);
  }

  @Post('shared-notes/:id/download')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiOperation({ summary: 'Download appunto con tracciamento statistiche' })
  async downloadNote(
    @CurrentUser('schoolId') schoolId: string,
    @Param('id') id: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.notesService.recordDownload(schoolId, id);
  }

  @Put('shared-notes/:id/rating')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiOperation({ summary: 'Valutazione appunto da 1 a 5 stelle con media Bayesiana' })
  async rateNote(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body('stars') stars: number,
  ) {
    return this.notesService.rateNote(id, userId, stars);
  }

  @Delete('shared-notes/:id/rating')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiOperation({ summary: 'Rimozione propria valutazione' })
  async deleteRating(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.notesService.deleteRating(id, userId);
  }

  @Put('shared-notes/:id/bookmark')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiOperation({ summary: 'Salvataggio appunto nei segnalibri personali' })
  async bookmarkNote(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.notesService.bookmarkNote(id, userId);
  }

  @Delete('shared-notes/:id/bookmark')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiOperation({ summary: 'Rimozione appunto dai segnalibri' })
  async unbookmarkNote(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.notesService.unbookmarkNote(id, userId);
  }

  @Get('shared-notes/:id/comments')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiOperation({ summary: 'Elenco commenti con risposte annidate' })
  async listComments(@Param('id') id: string) {
    return this.notesService.listComments(id);
  }

  @Post('shared-notes/:id/comments')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiOperation({ summary: 'Pubblicazione commento a un appunto' })
  async createComment(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.notesService.createComment(schoolId, id, userId, dto);
  }

  @Patch('note-comments/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiOperation({ summary: 'Modifica commento (entro 10 minuti dalla pubblicazione)' })
  async updateComment(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body('body') body: string,
  ) {
    return this.notesService.updateComment(id, userId, body);
  }

  @Delete('note-comments/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiOperation({ summary: 'Eliminazione proprio commento' })
  async deleteComment(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Param('id') id: string,
  ) {
    const isElevated = role === Role.SCHOOL_ADMIN || role === Role.SUPER_ADMIN;
    return this.notesService.deleteComment(id, userId, isElevated);
  }

  @Post('shared-notes/:id/report')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiOperation({ summary: 'Segnalazione appunto con occultamento automatico alla 3ª segnalazione' })
  async reportNote(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: ReportNoteDto,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.notesService.reportNote(schoolId, id, userId, dto);
  }

  @Post('shared-notes/:id/verify')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Attestazione badge Verificato dal docente' })
  async toggleVerification(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') teacherUserId: string,
    @Param('id') id: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.notesService.toggleVerification(schoolId, id, teacherUserId);
  }

  @Post('shared-notes/:id/hide')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Occultamento cautelativo dell\'appunto' })
  async hideNote(
    @CurrentUser('schoolId') schoolId: string,
    @Param('id') id: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.notesService.setNoteStatus(schoolId, id, NoteStatus.HIDDEN);
  }

  @Post('shared-notes/:id/restore')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Ripristino appunto nascosto' })
  async restoreNote(
    @CurrentUser('schoolId') schoolId: string,
    @Param('id') id: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.notesService.setNoteStatus(schoolId, id, NoteStatus.PUBLISHED);
  }

  @Get('me/shared-notes')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiOperation({ summary: 'Elenco miei appunti personali' })
  async getMyNotes(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') userId: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.notesService.getMyNotes(schoolId, userId);
  }

  @Get('me/bookmarks')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiOperation({ summary: 'Elenco appunti salvati nei preferiti' })
  async getMyBookmarks(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') userId: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.notesService.getMyBookmarks(schoolId, userId);
  }

  @Get('tags')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiOperation({ summary: 'Autocompletamento tag' })
  async autocompleteTags(@Query('q') q?: string) {
    return this.notesService.autocompleteTags(q);
  }
}
