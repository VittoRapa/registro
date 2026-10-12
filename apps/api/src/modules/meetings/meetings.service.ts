import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MeetingMode, BookingStatus } from '@prisma/client';
import { Role } from '@registro/shared';

export interface CreateSlotDto {
  startAt: string;
  endAt: string;
  capacity?: number;
  mode?: MeetingMode;
  link?: string;
}

export interface BookSlotDto {
  slotId: string;
  studentProfileId: string;
  note?: string;
}

@Injectable()
export class MeetingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Teacher creates availability slot for parent meetings
   */
  async createSlot(teacherId: string, dto: CreateSlotDto) {
    const start = new Date(dto.startAt);
    const end = new Date(dto.endAt);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      throw new BadRequestException('Intervallo orario non valido per lo slot di colloquio');
    }

    return this.prisma.teacherAvailabilitySlot.create({
      data: {
        teacherId,
        startAt: start,
        endAt: end,
        capacity: dto.capacity || 1,
        mode: dto.mode || MeetingMode.PRESENZA,
        link: dto.link || null,
      },
    });
  }

  /**
   * List slots for a teacher (or all teachers in school)
   */
  async listSlots(teacherId?: string) {
    return this.prisma.teacherAvailabilitySlot.findMany({
      where: {
        ...(teacherId && { teacherId }),
        startAt: { gte: new Date() },
      },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        bookings: {
          where: { status: BookingStatus.BOOKED },
          select: { id: true },
        },
      },
      orderBy: { startAt: 'asc' },
    });
  }

  /**
   * Delete an availability slot
   */
  async deleteSlot(teacherId: string, slotId: string, isElevated = false) {
    const slot = await this.prisma.teacherAvailabilitySlot.findFirst({
      where: {
        id: slotId,
        ...(!isElevated && { teacherId }),
      },
    });
    if (!slot) {
      throw new NotFoundException('Slot di disponibilità non trovato');
    }

    await this.prisma.teacherAvailabilitySlot.delete({ where: { id: slotId } });
    return { message: 'Slot eliminato con successo' };
  }

  /**
   * Parent books an open slot
   */
  async bookSlot(parentUserId: string, dto: BookSlotDto) {
    const slot = await this.prisma.teacherAvailabilitySlot.findUnique({
      where: { id: dto.slotId },
      include: {
        bookings: { where: { status: BookingStatus.BOOKED } },
      },
    });
    if (!slot) {
      throw new NotFoundException('Slot di colloquio non trovato');
    }

    if (slot.bookings.length >= slot.capacity) {
      throw new BadRequestException('Questo slot ha già raggiunto la capienza massima');
    }

    // Verify parent is linked to student
    const link = await this.prisma.parentLink.findFirst({
      where: {
        parentUserId,
        studentProfileId: dto.studentProfileId,
      },
    });
    if (!link) {
      throw new ForbiddenException('Non hai autorizzazione per prenotare a nome di questo studente');
    }

    return this.prisma.meetingBooking.create({
      data: {
        slotId: dto.slotId,
        parentUserId,
        studentProfileId: dto.studentProfileId,
        status: BookingStatus.BOOKED,
        note: dto.note || null,
      },
      include: {
        slot: {
          include: {
            teacher: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  /**
   * List bookings for parent or teacher
   */
  async listBookings(userId: string, role: Role) {
    if (role === Role.TEACHER) {
      return this.prisma.meetingBooking.findMany({
        where: { slot: { teacherId: userId } },
        include: {
          slot: true,
          parent: { select: { id: true, firstName: true, lastName: true, email: true } },
          studentProfile: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { slot: { startAt: 'desc' } },
      });
    }

    // For parent
    return this.prisma.meetingBooking.findMany({
      where: { parentUserId: userId },
      include: {
        slot: {
          include: {
            teacher: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        studentProfile: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { slot: { startAt: 'desc' } },
    });
  }

  /**
   * Cancel or update status of booking
   */
  async updateBookingStatus(
    userId: string,
    role: Role,
    bookingId: string,
    status: BookingStatus,
  ) {
    const isTeacher = role === Role.TEACHER;
    const isElevated = role === Role.SUPER_ADMIN || role === Role.SCHOOL_ADMIN;

    const booking = await this.prisma.meetingBooking.findFirst({
      where: {
        id: bookingId,
        ...(!isElevated && !isTeacher && { parentUserId: userId }),
        ...(!isElevated && isTeacher && { slot: { teacherId: userId } }),
      },
    });
    if (!booking) {
      throw new NotFoundException('Prenotazione non trovata o permessi non validi');
    }

    return this.prisma.meetingBooking.update({
      where: { id: bookingId },
      data: { status },
    });
  }
}
