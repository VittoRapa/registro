import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@registro/shared';

@ApiTags('Calendar iCal Feed')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('feed.ics')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Esportazione feed calendario in formato standard RFC 5545 iCalendar (.ics)' })
  async getIcsFeed(
    @CurrentUser('schoolId') schoolId: string,
    @Query('classId') classId: string,
    @Res() res: Response,
  ) {
    if (!schoolId) {
      throw new ForbiddenException('Contesto scuola non specificato');
    }

    const icsContent = await this.calendarService.generateIcsFeed(schoolId, classId);

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="registro-agenda.ics"');
    res.send(icsContent);
  }
}
