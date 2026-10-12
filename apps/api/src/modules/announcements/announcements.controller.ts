import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnnouncementsService, CreateAnnouncementDto } from './announcements.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@registro/shared';

@ApiTags('Announcements')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Elenco circolari e comunicazioni' })
  async listAnnouncements(@CurrentUser('schoolId') schoolId: string) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.announcementsService.listAnnouncements(schoolId);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Dettagli singola comunicazione' })
  async getAnnouncement(
    @CurrentUser('schoolId') schoolId: string,
    @Param('id') id: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.announcementsService.getAnnouncement(schoolId, id);
  }

  @Post()
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Pubblicazione nuova circolare istituzionale' })
  async createAnnouncement(
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') authorUserId: string,
    @Body() dto: CreateAnnouncementDto,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.announcementsService.createAnnouncement(schoolId, authorUserId, dto);
  }

  @Post(':id/read')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Segna circolare come letta' })
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.announcementsService.markAsRead(userId, id);
  }

  @Post(':id/ack')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Conferma presa visione formale della circolare' })
  async acknowledge(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.announcementsService.acknowledge(userId, id);
  }

  @Get(':id/stats')
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Statistiche di lettura e presa visione per circolare' })
  async getStats(
    @CurrentUser('schoolId') schoolId: string,
    @Param('id') id: string,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }
    return this.announcementsService.getReadStats(schoolId, id);
  }
}
