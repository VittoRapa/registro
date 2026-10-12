import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(schoolId: string) {
    return this.prisma.subject.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
    });
  }

  async get(schoolId: string, id: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id, schoolId },
    });
    if (!subject) throw new NotFoundException('Materia non trovata');
    return subject;
  }

  async create(schoolId: string, data: { name: string; shortName?: string; color?: string; isGraded?: boolean }) {
    const exists = await this.prisma.subject.findUnique({
      where: { schoolId_name: { schoolId, name: data.name } },
    });

    if (exists) throw new BadRequestException(`Materia "${data.name}" già esistente`);

    return this.prisma.subject.create({
      data: {
        schoolId,
        name: data.name,
        shortName: data.shortName,
        color: data.color || '#3b82f6',
        isGraded: data.isGraded ?? true,
      },
    });
  }

  async update(schoolId: string, id: string, data: { name?: string; shortName?: string; color?: string; isGraded?: boolean }) {
    await this.get(schoolId, id);

    return this.prisma.subject.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.shortName !== undefined && { shortName: data.shortName }),
        ...(data.color && { color: data.color }),
        ...(data.isGraded !== undefined && { isGraded: data.isGraded }),
      },
    });
  }

  async delete(schoolId: string, id: string) {
    await this.get(schoolId, id);
    await this.prisma.subject.delete({ where: { id } });
    return { message: 'Materia eliminata con successo' };
  }
}
