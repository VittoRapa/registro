import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AttendanceStatus, JustificationStatus, JustificationReasonType } from '@prisma/client';

export interface SingleAttendanceEntry {
  studentProfileId: string;
  status: AttendanceStatus;
  minutesLate?: number;
  exitTime?: string;
}

export interface BulkAttendanceDto {
  records: SingleAttendanceEntry[];
}

export interface SubmitJustificationDto {
  studentProfileId: string;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
  reasonType: JustificationReasonType;
  reasonText?: string;
}

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get attendance for a specific lesson record
   */
  async getLessonAttendance(schoolId: string, lessonRecordId: string) {
    const lesson = await this.prisma.lessonRecord.findFirst({
      where: { id: lessonRecordId, class: { schoolId } },
    });
    if (!lesson) {
      throw new NotFoundException('Registro lezione non trovato');
    }

    return this.prisma.attendanceRecord.findMany({
      where: { lessonRecordId },
      include: {
        studentProfile: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, username: true },
            },
          },
        },
        justification: true,
      },
    });
  }

  /**
   * Fast bulk roll call for class (Appello rapido <30 sec)
   */
  async recordBulkAttendance(
    schoolId: string,
    teacherUserId: string,
    lessonRecordId: string,
    dto: BulkAttendanceDto,
  ) {
    const lesson = await this.prisma.lessonRecord.findFirst({
      where: { id: lessonRecordId, class: { schoolId } },
    });
    if (!lesson) {
      throw new NotFoundException('Registro lezione non trovato');
    }

    const operations = dto.records.map((r) =>
      this.prisma.attendanceRecord.upsert({
        where: {
          lessonRecordId_studentProfileId: {
            lessonRecordId,
            studentProfileId: r.studentProfileId,
          },
        },
        create: {
          lessonRecordId,
          studentProfileId: r.studentProfileId,
          status: r.status,
          minutesLate: r.minutesLate,
          exitTime: r.exitTime,
          recordedByTeacherId: teacherUserId,
        },
        update: {
          status: r.status,
          minutesLate: r.minutesLate,
          exitTime: r.exitTime,
          recordedByTeacherId: teacherUserId,
        },
      }),
    );

    await this.prisma.$transaction(operations);

    return {
      message: 'Appello registrato con successo',
      count: dto.records.length,
    };
  }

  /**
   * Get attendance history and statistics for a student
   */
  async getStudentAttendanceHistory(schoolId: string, studentProfileId: string) {
    const profile = await this.prisma.studentProfile.findFirst({
      where: { id: studentProfileId, user: { schoolId } },
    });
    if (!profile) {
      throw new NotFoundException('Profilo studente non trovato');
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where: { studentProfileId },
      include: {
        lessonRecord: {
          include: {
            class: true,
            teachingAssignment: { include: { subject: true } },
          },
        },
        justification: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      totalHours: records.length,
      presentHours: records.filter((r) => r.status === AttendanceStatus.PRESENT).length,
      absentHours: records.filter((r) => r.status === AttendanceStatus.ABSENT).length,
      lateCount: records.filter((r) => r.status === AttendanceStatus.LATE).length,
      earlyExitCount: records.filter((r) => r.status === AttendanceStatus.EARLY_EXIT).length,
      unjustifiedAbsences: records.filter(
        (r) => r.status === AttendanceStatus.ABSENT && !r.justificationId,
      ).length,
    };

    return { stats, records };
  }

  /**
   * Submit justification (Parent or Student)
   */
  async submitJustification(
    schoolId: string,
    submitterUserId: string,
    dto: SubmitJustificationDto,
  ) {
    const profile = await this.prisma.studentProfile.findFirst({
      where: { id: dto.studentProfileId, user: { schoolId } },
    });
    if (!profile) {
      throw new NotFoundException('Studente non trovato');
    }

    const fromDate = new Date(dto.dateFrom);
    const toDate = new Date(dto.dateTo);

    if (fromDate > toDate) {
      throw new BadRequestException('La data di inizio non può essere successiva alla data di fine');
    }

    return this.prisma.justification.create({
      data: {
        studentProfileId: dto.studentProfileId,
        dateFrom: fromDate,
        dateTo: toDate,
        reasonType: dto.reasonType,
        reasonText: dto.reasonText,
        submittedByUserId: submitterUserId,
        status: JustificationStatus.PENDING,
      },
    });
  }

  /**
   * List pending justifications
   */
  async listJustifications(
    schoolId: string,
    query: { status?: JustificationStatus; studentProfileId?: string },
  ) {
    return this.prisma.justification.findMany({
      where: {
        studentProfile: { user: { schoolId } },
        ...(query.status && { status: query.status }),
        ...(query.studentProfileId && { studentProfileId: query.studentProfileId }),
      },
      include: {
        studentProfile: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        submittedBy: {
          select: { firstName: true, lastName: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Review justification (APPROVE or REJECT) and link to absence records
   */
  async reviewJustification(
    schoolId: string,
    reviewerUserId: string,
    justificationId: string,
    status: JustificationStatus,
  ) {
    const justification = await this.prisma.justification.findFirst({
      where: { id: justificationId, studentProfile: { user: { schoolId } } },
    });
    if (!justification) {
      throw new NotFoundException('Giustificazione non trovata');
    }

    const updated = await this.prisma.justification.update({
      where: { id: justificationId },
      data: {
        status,
        reviewedByUserId: reviewerUserId,
        reviewedAt: new Date(),
      },
    });

    if (status === JustificationStatus.APPROVED) {
      // Automatically link to attendance records within that date range
      await this.prisma.attendanceRecord.updateMany({
        where: {
          studentProfileId: justification.studentProfileId,
          status: AttendanceStatus.ABSENT,
          justificationId: null,
          lessonRecord: {
            date: {
              gte: justification.dateFrom,
              lte: justification.dateTo,
            },
          },
        },
        data: {
          justificationId,
        },
      });
    }

    return updated;
  }
}
