import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateClassDto {
  name: string;
  grade: number;
  section: string;
  track?: string;
  room?: string;
  coordinatorTeacherId?: string;
  academicYearId?: string;
}

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(schoolId: string, academicYearId?: string) {
    let yearId = academicYearId;
    if (!yearId) {
      const currentYear = await this.prisma.academicYear.findFirst({
        where: { schoolId, isCurrent: true },
      });
      yearId = currentYear?.id;
    }

    return this.prisma.class.findMany({
      where: {
        schoolId,
        ...(yearId && { academicYearId: yearId }),
      },
      include: {
        academicYear: { select: { id: true, name: true } },
        _count: {
          select: {
            enrollments: { where: { status: 'ACTIVE' } },
            teachingAssignments: true,
          },
        },
      },
      orderBy: [{ grade: 'asc' }, { section: 'asc' }],
    });
  }

  async get(schoolId: string, id: string) {
    const cls = await this.prisma.class.findFirst({
      where: { id, schoolId },
      include: {
        academicYear: true,
        teachingAssignments: {
          include: {
            subject: true,
            teacherProfile: {
              include: { user: { select: { id: true, firstName: true, lastName: true } } },
            },
          },
        },
        enrollments: {
          where: { status: 'ACTIVE' },
          include: {
            studentProfile: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true, username: true } },
              },
            },
          },
        },
      },
    });

    if (!cls) throw new NotFoundException('Classe non trovata');
    return cls;
  }

  async create(schoolId: string, dto: CreateClassDto) {
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

    const existing = await this.prisma.class.findUnique({
      where: {
        schoolId_academicYearId_name: {
          schoolId,
          academicYearId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(`Classe ${dto.name} già esistente per questo anno scolastico`);
    }

    return this.prisma.class.create({
      data: {
        schoolId,
        academicYearId,
        name: dto.name,
        grade: dto.grade,
        section: dto.section.toUpperCase(),
        track: dto.track,
        room: dto.room,
        coordinatorTeacherId: dto.coordinatorTeacherId,
      },
    });
  }

  async update(schoolId: string, id: string, data: Partial<CreateClassDto>) {
    await this.get(schoolId, id);

    return this.prisma.class.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.grade && { grade: data.grade }),
        ...(data.section && { section: data.section.toUpperCase() }),
        ...(data.track !== undefined && { track: data.track }),
        ...(data.room !== undefined && { room: data.room }),
        ...(data.coordinatorTeacherId !== undefined && { coordinatorTeacherId: data.coordinatorTeacherId }),
      },
    });
  }

  async delete(schoolId: string, id: string) {
    await this.get(schoolId, id);
    await this.prisma.class.delete({ where: { id } });
    return { message: 'Classe eliminata con successo' };
  }

  async listStudents(schoolId: string, classId: string) {
    await this.get(schoolId, classId);

    const enrollments = await this.prisma.enrollment.findMany({
      where: { classId, status: 'ACTIVE' },
      include: {
        studentProfile: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                email: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: {
        studentProfile: {
          user: { lastName: 'asc' },
        },
      },
    });

    return enrollments.map((e) => ({
      enrollmentId: e.id,
      startDate: e.startDate,
      studentId: e.studentProfile.userId,
      matricola: e.studentProfile.matricola,
      ...e.studentProfile.user,
    }));
  }

  async enrollStudent(schoolId: string, classId: string, studentProfileId: string) {
    await this.get(schoolId, classId);

    // End previous active enrollment if any
    await this.prisma.enrollment.updateMany({
      where: { studentProfileId, status: 'ACTIVE' },
      data: { status: 'TRANSFERRED', endDate: new Date() },
    });

    return this.prisma.enrollment.create({
      data: {
        classId,
        studentProfileId,
        status: 'ACTIVE',
      },
    });
  }

  async removeStudent(schoolId: string, classId: string, studentProfileId: string) {
    await this.get(schoolId, classId);

    await this.prisma.enrollment.updateMany({
      where: { classId, studentProfileId, status: 'ACTIVE' },
      data: { status: 'WITHDRAWN', endDate: new Date() },
    });

    return { message: 'Studente rimosso dalla classe' };
  }
}
