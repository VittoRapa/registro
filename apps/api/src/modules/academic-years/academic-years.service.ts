import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AcademicYearsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(schoolId: string) {
    return this.prisma.academicYear.findMany({
      where: { schoolId },
      include: {
        terms: { orderBy: { order: 'asc' } },
        _count: { select: { classes: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async getCurrent(schoolId: string) {
    const current = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      include: { terms: { orderBy: { order: 'asc' } } },
    });

    if (!current) {
      // Fallback to latest
      return this.prisma.academicYear.findFirst({
        where: { schoolId },
        include: { terms: { orderBy: { order: 'asc' } } },
        orderBy: { startDate: 'desc' },
      });
    }

    return current;
  }

  async create(schoolId: string, data: { name: string; startDate: string; endDate: string; isCurrent?: boolean }) {
    if (data.isCurrent) {
      // Unset previous current
      await this.prisma.academicYear.updateMany({
        where: { schoolId, isCurrent: true },
        data: { isCurrent: false },
      });
    }

    return this.prisma.academicYear.create({
      data: {
        schoolId,
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        isCurrent: data.isCurrent ?? false,
      },
    });
  }

  async addTerm(academicYearId: string, data: { name: string; startDate: string; endDate: string; order: number }) {
    const year = await this.prisma.academicYear.findUnique({ where: { id: academicYearId } });
    if (!year) throw new NotFoundException('Anno accademico non trovato');

    return this.prisma.term.create({
      data: {
        academicYearId,
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        order: data.order,
      },
    });
  }
}
