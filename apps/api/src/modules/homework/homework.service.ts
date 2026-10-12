import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HomeworkSubmissionStatus } from '@prisma/client';

export interface CreateHomeworkDto {
  teachingAssignmentId: string;
  classId: string;
  title: string;
  description?: string;
  assignedDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  estimatedMinutes?: number;
}

@Injectable()
export class HomeworkService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List homework for a class
   */
  async listHomework(schoolId: string, classId?: string, dueDate?: string) {
    return this.prisma.homework.findMany({
      where: {
        class: {
          schoolId,
          ...(classId && { id: classId }),
        },
        ...(dueDate && { dueDate: new Date(dueDate) }),
      },
      include: {
        teachingAssignment: {
          include: { subject: true },
        },
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Create homework assigned to class
   */
  async createHomework(
    schoolId: string,
    teacherUserId: string,
    dto: CreateHomeworkDto,
  ) {
    const classRecord = await this.prisma.class.findFirst({
      where: { id: dto.classId, schoolId },
    });
    if (!classRecord) {
      throw new NotFoundException('Classe non trovata');
    }

    return this.prisma.homework.create({
      data: {
        teachingAssignmentId: dto.teachingAssignmentId,
        classId: dto.classId,
        createdByUserId: teacherUserId,
        title: dto.title,
        description: dto.description,
        assignedDate: new Date(dto.assignedDate),
        dueDate: new Date(dto.dueDate),
        estimatedMinutes: dto.estimatedMinutes,
      },
      include: {
        teachingAssignment: { include: { subject: true } },
      },
    });
  }

  /**
   * Update student completion status (TODO / DONE)
   */
  async updateStatus(
    schoolId: string,
    studentUserId: string,
    homeworkId: string,
    status: HomeworkSubmissionStatus,
  ) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { userId: studentUserId, user: { schoolId } },
    });
    if (!student) {
      throw new NotFoundException('Profilo studente non trovato');
    }

    return this.prisma.homeworkStatus.upsert({
      where: {
        homeworkId_studentProfileId: {
          homeworkId,
          studentProfileId: student.id,
        },
      },
      create: {
        homeworkId,
        studentProfileId: student.id,
        status,
        doneAt: status === HomeworkSubmissionStatus.DONE ? new Date() : null,
      },
      update: {
        status,
        doneAt: status === HomeworkSubmissionStatus.DONE ? new Date() : null,
      },
    });
  }
}
