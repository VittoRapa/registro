import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateAssignmentDto {
  classId: string;
  subjectId: string;
  teacherProfileId: string;
  academicYearId?: string;
  hoursPerWeek?: number;
}

@Injectable()
export class TeachingAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(schoolId: string, filters: { classId?: string; teacherProfileId?: string; academicYearId?: string }) {
    return this.prisma.teachingAssignment.findMany({
      where: {
        class: { schoolId },
        ...(filters.classId && { classId: filters.classId }),
        ...(filters.teacherProfileId && { teacherProfileId: filters.teacherProfileId }),
        ...(filters.academicYearId && { academicYearId: filters.academicYearId }),
      },
      include: {
        class: { select: { id: true, name: true, grade: true, section: true } },
        subject: { select: { id: true, name: true, color: true } },
        teacherProfile: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        academicYear: { select: { id: true, name: true } },
      },
      orderBy: [{ class: { name: 'asc' } }, { subject: { name: 'asc' } }],
    });
  }

  async create(schoolId: string, dto: CreateAssignmentDto) {
    let academicYearId = dto.academicYearId;
    if (!academicYearId) {
      const currentYear = await this.prisma.academicYear.findFirst({
        where: { schoolId, isCurrent: true },
      });
      if (!currentYear) {
        throw new BadRequestException('Nessun anno accademico corrente configurato');
      }
      academicYearId = currentYear.id;
    }

    const existing = await this.prisma.teachingAssignment.findUnique({
      where: {
        classId_subjectId_teacherProfileId: {
          classId: dto.classId,
          subjectId: dto.subjectId,
          teacherProfileId: dto.teacherProfileId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Assegnazione già esistente per questa classe, materia e docente');
    }

    return this.prisma.teachingAssignment.create({
      data: {
        classId: dto.classId,
        subjectId: dto.subjectId,
        teacherProfileId: dto.teacherProfileId,
        academicYearId,
        hoursPerWeek: dto.hoursPerWeek,
      },
      include: {
        class: true,
        subject: true,
        teacherProfile: { include: { user: true } },
      },
    });
  }

  async delete(schoolId: string, id: string) {
    const existing = await this.prisma.teachingAssignment.findFirst({
      where: { id, class: { schoolId } },
    });

    if (!existing) {
      throw new NotFoundException('Assegnazione non trovata');
    }

    await this.prisma.teachingAssignment.delete({ where: { id } });
    return { message: 'Assegnazione docente rimossa con successo' };
  }
}
