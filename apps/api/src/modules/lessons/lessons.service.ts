import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LessonType } from '@prisma/client';

export interface SignLessonDto {
  classId: string;
  teachingAssignmentId: string;
  date: string; // YYYY-MM-DD
  periodNumber: number;
  topic?: string;
  notes?: string;
  type?: LessonType;
}

export interface UpdateLessonDto {
  topic?: string;
  notes?: string;
}

export interface LessonQueryFilters {
  classId?: string;
  date?: string;
  teachingAssignmentId?: string;
}

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search/list lessons with filters
   */
  async listLessons(schoolId: string, filters: LessonQueryFilters) {
    const where = {
      class: { schoolId },
      ...(filters.classId && { classId: filters.classId }),
      ...(filters.date && { date: new Date(filters.date) }),
      ...(filters.teachingAssignmentId && {
        teachingAssignmentId: filters.teachingAssignmentId,
      }),
    };

    return this.prisma.lessonRecord.findMany({
      where,
      include: {
        teachingAssignment: {
          include: {
            subject: true,
            teacherProfile: {
              include: {
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
        signedByTeacher: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: { select: { attendanceRecords: true } },
      },
      orderBy: [{ date: 'desc' }, { periodNumber: 'asc' }],
    });
  }

  /**
   * Get single lesson details with attendances
   */
  async getLesson(schoolId: string, id: string) {
    const lesson = await this.prisma.lessonRecord.findFirst({
      where: { id, class: { schoolId } },
      include: {
        class: true,
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
        signedByTeacher: {
          select: { id: true, firstName: true, lastName: true },
        },
        attendanceRecords: {
          include: {
            studentProfile: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Registro lezione non trovato');
    }

    return lesson;
  }

  /**
   * Sign lesson (Firma registro docente)
   */
  async signLesson(schoolId: string, teacherUserId: string, dto: SignLessonDto) {
    // 1. Verify class belongs to school
    const classRecord = await this.prisma.class.findFirst({
      where: { id: dto.classId, schoolId },
    });
    if (!classRecord) {
      throw new NotFoundException('Classe non trovata');
    }

    const lessonDate = new Date(dto.date);

    // Upsert lesson record for that class, date, and periodNumber
    return this.prisma.lessonRecord.upsert({
      where: {
        classId_date_periodNumber: {
          classId: dto.classId,
          date: lessonDate,
          periodNumber: dto.periodNumber,
        },
      },
      create: {
        classId: dto.classId,
        teachingAssignmentId: dto.teachingAssignmentId,
        date: lessonDate,
        periodNumber: dto.periodNumber,
        topic: dto.topic,
        notes: dto.notes,
        type: dto.type || 'LESSON',
        signedByTeacherId: teacherUserId,
        signedAt: new Date(),
      },
      update: {
        teachingAssignmentId: dto.teachingAssignmentId,
        topic: dto.topic,
        notes: dto.notes,
        type: dto.type || 'LESSON',
        signedByTeacherId: teacherUserId,
        signedAt: new Date(),
      },
      include: {
        teachingAssignment: { include: { subject: true } },
      },
    });
  }

  /**
   * Update topic or notes of an already signed lesson
   */
  async updateLesson(
    schoolId: string,
    teacherUserId: string,
    id: string,
    dto: UpdateLessonDto,
  ) {
    const existing = await this.prisma.lessonRecord.findFirst({
      where: { id, class: { schoolId } },
    });
    if (!existing) {
      throw new NotFoundException('Lezione non trovata');
    }

    // Check if signer or admin
    if (existing.signedByTeacherId && existing.signedByTeacherId !== teacherUserId) {
      // Teachers can only modify their own signatures
      const user = await this.prisma.user.findUnique({ where: { id: teacherUserId } });
      if (user?.role !== 'SCHOOL_ADMIN' && user?.role !== 'SUPER_ADMIN') {
        throw new ForbiddenException('Non puoi modificare una lezione firmata da un altro docente');
      }
    }

    return this.prisma.lessonRecord.update({
      where: { id },
      data: {
        ...(dto.topic !== undefined && { topic: dto.topic }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }
}
