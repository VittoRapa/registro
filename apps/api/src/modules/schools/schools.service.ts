import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface UpdateSchoolDto {
  name?: string;
  address?: string;
  city?: string;
  province?: string;
  timezone?: string;
  locale?: string;
  settings?: Record<string, unknown>;
}

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSchool(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      throw new NotFoundException('Scuola non trovata');
    }

    return school;
  }

  async updateSchool(
    schoolId: string,
    data: UpdateSchoolDto,
    actorUserId?: string,
  ) {
    const existing = await this.getSchool(schoolId);

    const mergedSettings = data.settings
      ? { ...((existing.settings as Record<string, unknown>) || {}), ...data.settings }
      : undefined;

    const updated = await this.prisma.school.update({
      where: { id: schoolId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.address && { address: data.address }),
        ...(data.city && { city: data.city }),
        ...(data.province && { province: data.province }),
        ...(data.timezone && { timezone: data.timezone }),
        ...(data.locale && { locale: data.locale }),
        ...(mergedSettings && { settings: mergedSettings as Prisma.InputJsonValue }),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        schoolId,
        actorUserId: actorUserId || null,
        actorRole: 'SCHOOL_ADMIN',
        action: 'SCHOOL_SETTINGS_UPDATED',
        entityType: 'School',
        entityId: schoolId,
        before: existing.settings ? (existing.settings as Prisma.InputJsonValue) : Prisma.DbNull,
        after: mergedSettings ? (mergedSettings as Prisma.InputJsonValue) : Prisma.DbNull,
      },
    });

    return updated;
  }
}
