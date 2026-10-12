import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateTimetableSlotDto {
  classId: string;
  teachingAssignmentId: string;
  weekday: number; // 1=Mon ... 6=Sat
  periodNumber: number; // 1 ... 8
  startTime: string; // "08:00"
  endTime: string; // "09:00"
  room?: string;
  validFrom: string; // YYYY-MM-DD
  validTo?: string; // YYYY-MM-DD
}

export interface CreateSubstitutionDto {
  slotId: string;
  date: string; // YYYY-MM-DD
  substituteTeacherId?: string;
  reason?: string;
}

@Injectable()
export class TimetableService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get weekly schedule for a class
   */
  async getClassTimetable(schoolId: string, classId: string) {
    const classRecord = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
    });
    if (!classRecord) {
      throw new NotFoundException('Classe non trovata');
    }

    return this.prisma.timetableSlot.findMany({
      where: { classId },
      include: {
        teachingAssignment: {
          include: {
            subject: true,
            teacherProfile: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
        substitutions: true,
      },
      orderBy: [{ weekday: 'asc' }, { periodNumber: 'asc' }],
    });
  }

  /**
   * Get weekly schedule for a teacher
   */
  async getTeacherTimetable(schoolId: string, teacherUserId: string) {
    const teacherProfile = await this.prisma.teacherProfile.findUnique({
      where: { userId: teacherUserId },
    });
    if (!teacherProfile) {
      throw new NotFoundException('Profilo docente non trovato');
    }

    return this.prisma.timetableSlot.findMany({
      where: {
        teachingAssignment: {
          teacherProfileId: teacherProfile.id,
          class: { schoolId },
        },
      },
      include: {
        class: true,
        teachingAssignment: {
          include: { subject: true },
        },
      },
      orderBy: [{ weekday: 'asc' }, { periodNumber: 'asc' }],
    });
  }

  /**
   * Add slot to timetable with conflict check (teacher and class)
   */
  async createSlot(schoolId: string, dto: CreateTimetableSlotDto) {
    // 1. Verify class belongs to tenant
    const classRecord = await this.prisma.class.findFirst({
      where: { id: dto.classId, schoolId },
    });
    if (!classRecord) {
      throw new NotFoundException('Classe non trovata');
    }

    // 2. Verify assignment belongs to class
    const assignment = await this.prisma.teachingAssignment.findFirst({
      where: { id: dto.teachingAssignmentId, classId: dto.classId },
      include: { teacherProfile: true },
    });
    if (!assignment) {
      throw new BadRequestException('Assegnazione cattedra non valida per questa classe');
    }

    // 3. Check class conflict: already has a lesson at this weekday & periodNumber
    const existingClassSlot = await this.prisma.timetableSlot.findFirst({
      where: {
        classId: dto.classId,
        weekday: dto.weekday,
        periodNumber: dto.periodNumber,
      },
    });
    if (existingClassSlot) {
      throw new ConflictException(
        `La classe ha già una lezione configurata per il giorno ${dto.weekday}, ora ${dto.periodNumber}`,
      );
    }

    // 4. Check teacher conflict: teacher cannot teach in another class in the same slot
    const existingTeacherSlot = await this.prisma.timetableSlot.findFirst({
      where: {
        weekday: dto.weekday,
        periodNumber: dto.periodNumber,
        teachingAssignment: {
          teacherProfileId: assignment.teacherProfileId,
        },
      },
      include: { class: true },
    });
    if (existingTeacherSlot) {
      throw new ConflictException(
        `Il docente è già impegnato nella classe ${existingTeacherSlot.class.name} il giorno ${dto.weekday}, ora ${dto.periodNumber}`,
      );
    }

    return this.prisma.timetableSlot.create({
      data: {
        classId: dto.classId,
        teachingAssignmentId: dto.teachingAssignmentId,
        weekday: dto.weekday,
        periodNumber: dto.periodNumber,
        startTime: dto.startTime,
        endTime: dto.endTime,
        room: dto.room,
        validFrom: new Date(dto.validFrom),
        validTo: dto.validTo ? new Date(dto.validTo) : null,
      },
      include: {
        teachingAssignment: {
          include: {
            subject: true,
            teacherProfile: {
              include: { user: { select: { firstName: true, lastName: true } } },
            },
          },
        },
      },
    });
  }

  /**
   * Delete a timetable slot
   */
  async deleteSlot(schoolId: string, slotId: string) {
    const slot = await this.prisma.timetableSlot.findUnique({
      where: { id: slotId },
      include: { class: true },
    });
    if (!slot || slot.class.schoolId !== schoolId) {
      throw new NotFoundException('Slot orario non trovato');
    }

    await this.prisma.timetableSlot.delete({ where: { id: slotId } });
    return { message: 'Slot orario rimosso' };
  }

  /**
   * Add a substitution for a specific date
   */
  async createSubstitution(schoolId: string, dto: CreateSubstitutionDto) {
    const slot = await this.prisma.timetableSlot.findUnique({
      where: { id: dto.slotId },
      include: { class: true },
    });
    if (!slot || slot.class.schoolId !== schoolId) {
      throw new NotFoundException('Slot orario non trovato');
    }

    return this.prisma.timetableSubstitution.create({
      data: {
        slotId: dto.slotId,
        date: new Date(dto.date),
        substituteTeacherId: dto.substituteTeacherId,
        reason: dto.reason,
      },
    });
  }
}
