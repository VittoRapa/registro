import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  MeetingsService,
  CreateSlotDto,
  BookSlotDto,
} from './meetings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@registro/shared';
import { BookingStatus } from '@prisma/client';

@ApiTags('Parent-Teacher Meetings')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get('slots')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.PARENT, Role.STUDENT)
  @ApiOperation({ summary: 'Elenco slot di disponibilità colloqui' })
  async listSlots(@Query('teacherId') teacherId?: string) {
    return this.meetingsService.listSlots(teacherId);
  }

  @Post('slots')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Docente: definisce slot di disponibilità' })
  async createSlot(
    @CurrentUser('id') teacherId: string,
    @Body() dto: CreateSlotDto,
  ) {
    return this.meetingsService.createSlot(teacherId, dto);
  }

  @Delete('slots/:id')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Docente: annulla slot di disponibilità' })
  async deleteSlot(
    @CurrentUser('id') teacherId: string,
    @CurrentUser('role') role: Role,
    @Param('id') slotId: string,
  ) {
    const isElevated = role === Role.SUPER_ADMIN || role === Role.SCHOOL_ADMIN;
    return this.meetingsService.deleteSlot(teacherId, slotId, isElevated);
  }

  @Get('bookings')
  @Roles(Role.TEACHER, Role.PARENT, Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Elenco prenotazioni colloqui' })
  async listBookings(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.meetingsService.listBookings(userId, role);
  }

  @Post('bookings')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Genitore: prenota colloquio' })
  async bookSlot(
    @CurrentUser('id') parentUserId: string,
    @Body() dto: BookSlotDto,
  ) {
    return this.meetingsService.bookSlot(parentUserId, dto);
  }

  @Patch('bookings/:id/status')
  @Roles(Role.TEACHER, Role.PARENT, Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Modifica stato prenotazione (es. cancellazione)' })
  async updateBookingStatus(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Param('id') bookingId: string,
    @Body('status') status: BookingStatus,
  ) {
    return this.meetingsService.updateBookingStatus(userId, role, bookingId, status);
  }
}
