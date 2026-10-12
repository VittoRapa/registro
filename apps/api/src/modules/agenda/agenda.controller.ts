import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AgendaService, CreateAgendaEventDto } from './agenda.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@registro/shared';

@ApiTags('Agenda')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('agenda')
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Elenco eventi agenda per classe o intervallo temporale' })
  async listEvents(
    @CurrentUser('schoolId') schoolId: string,
    @Query('classId') classId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.agendaService.listEvents(schoolId, { classId, from, to });
  }

  @Post()
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Aggiunta evento in agenda' })
  async createEvent(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() dto: CreateAgendaEventDto,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.agendaService.createEvent(schoolId, actorUserId, dto);
  }

  @Delete(':id')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Eliminazione evento agenda' })
  async deleteEvent(
    @CurrentUser('schoolId') schoolId: string,
    @Param('id') id: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.agendaService.deleteEvent(schoolId, id);
  }
}
