import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MeetingsService } from './meetings.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MeetingMode, BookingStatus } from '@prisma/client';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@registro/shared';

describe('MeetingsService', () => {
  let service: MeetingsService;
  let prismaMock: {
    teacherAvailabilitySlot: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    parentLink: {
      findFirst: ReturnType<typeof vi.fn>;
    };
    meetingBooking: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    prismaMock = {
      teacherAvailabilitySlot: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      parentLink: {
        findFirst: vi.fn(),
      },
      meetingBooking: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };

    service = new MeetingsService(prismaMock as unknown as PrismaService);
  });

  describe('createSlot', () => {
    it('throws BadRequestException for invalid or inverted dates', async () => {
      await expect(
        service.createSlot('teacher-1', {
          startAt: '2026-10-15T15:00:00Z',
          endAt: '2026-10-15T14:00:00Z', // start > end
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates slot with correct default capacity and mode', async () => {
      const startAt = '2026-10-15T14:00:00Z';
      const endAt = '2026-10-15T15:00:00Z';

      prismaMock.teacherAvailabilitySlot.create.mockResolvedValue({
        id: 'slot-1',
        teacherId: 'teacher-1',
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        capacity: 1,
        mode: MeetingMode.PRESENZA,
      });

      const res = await service.createSlot('teacher-1', { startAt, endAt });
      expect(res.id).toBe('slot-1');
      expect(prismaMock.teacherAvailabilitySlot.create).toHaveBeenCalledWith({
        data: {
          teacherId: 'teacher-1',
          startAt: new Date(startAt),
          endAt: new Date(endAt),
          capacity: 1,
          mode: MeetingMode.PRESENZA,
          link: null,
        },
      });
    });
  });

  describe('deleteSlot', () => {
    it('throws NotFoundException if slot not found for teacher', async () => {
      prismaMock.teacherAvailabilitySlot.findFirst.mockResolvedValue(null);

      await expect(service.deleteSlot('teacher-1', 'slot-999', false)).rejects.toThrow(NotFoundException);
    });

    it('deletes slot successfully when found', async () => {
      prismaMock.teacherAvailabilitySlot.findFirst.mockResolvedValue({ id: 'slot-1', teacherId: 'teacher-1' });

      const res = await service.deleteSlot('teacher-1', 'slot-1', false);
      expect(res.message).toBe('Slot eliminato con successo');
      expect(prismaMock.teacherAvailabilitySlot.delete).toHaveBeenCalledWith({ where: { id: 'slot-1' } });
    });
  });

  describe('bookSlot', () => {
    it('throws NotFoundException if slot does not exist', async () => {
      prismaMock.teacherAvailabilitySlot.findUnique.mockResolvedValue(null);

      await expect(
        service.bookSlot('parent-1', { slotId: 'slot-404', studentProfileId: 'student-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if slot capacity is already reached', async () => {
      prismaMock.teacherAvailabilitySlot.findUnique.mockResolvedValue({
        id: 'slot-1',
        capacity: 1,
        bookings: [{ id: 'b1' }],
      });

      await expect(
        service.bookSlot('parent-1', { slotId: 'slot-1', studentProfileId: 'student-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException if parent is not linked to the student', async () => {
      prismaMock.teacherAvailabilitySlot.findUnique.mockResolvedValue({
        id: 'slot-1',
        capacity: 2,
        bookings: [],
      });
      prismaMock.parentLink.findFirst.mockResolvedValue(null); // not linked

      await expect(
        service.bookSlot('parent-1', { slotId: 'slot-1', studentProfileId: 'student-1' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates booking successfully when validated', async () => {
      prismaMock.teacherAvailabilitySlot.findUnique.mockResolvedValue({
        id: 'slot-1',
        capacity: 2,
        bookings: [],
      });
      prismaMock.parentLink.findFirst.mockResolvedValue({
        id: 'link-1',
        parentUserId: 'parent-1',
        studentProfileId: 'student-1',
      });
      prismaMock.meetingBooking.create.mockResolvedValue({
        id: 'booking-1',
        status: BookingStatus.BOOKED,
      });

      const res = await service.bookSlot('parent-1', {
        slotId: 'slot-1',
        studentProfileId: 'student-1',
        note: 'Richiesta colloquio per andamento matematica',
      });

      expect(res.id).toBe('booking-1');
      expect(prismaMock.meetingBooking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slotId: 'slot-1',
            parentUserId: 'parent-1',
            studentProfileId: 'student-1',
            status: BookingStatus.BOOKED,
            note: 'Richiesta colloquio per andamento matematica',
          }),
        }),
      );
    });
  });

  describe('updateBookingStatus', () => {
    it('throws NotFoundException if booking not found', async () => {
      prismaMock.meetingBooking.findFirst.mockResolvedValue(null);

      await expect(
        service.updateBookingStatus('parent-1', Role.PARENT, 'b-404', BookingStatus.CANCELLED),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates booking status successfully', async () => {
      prismaMock.meetingBooking.findFirst.mockResolvedValue({
        id: 'b-1',
        parentUserId: 'parent-1',
        status: BookingStatus.BOOKED,
      });
      prismaMock.meetingBooking.update.mockResolvedValue({
        id: 'b-1',
        status: BookingStatus.CANCELLED,
      });

      const res = await service.updateBookingStatus('parent-1', Role.PARENT, 'b-1', BookingStatus.CANCELLED);
      expect(res.status).toBe(BookingStatus.CANCELLED);
      expect(prismaMock.meetingBooking.update).toHaveBeenCalledWith({
        where: { id: 'b-1' },
        data: { status: BookingStatus.CANCELLED },
      });
    });
  });
});
