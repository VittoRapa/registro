import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { Role } from '@registro/shared';

export interface CreateSchoolDto {
  name: string;
  slug: string;
  code?: string;
  city?: string;
  province?: string;
  address?: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminUsername: string;
}

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) {}

  async listSchools() {
    return this.prisma.school.findMany({
      include: {
        _count: {
          select: {
            users: true,
            classes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSchool(id: string) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            classes: true,
            subjects: true,
          },
        },
      },
    });

    if (!school) {
      throw new NotFoundException('Scuola non trovata');
    }

    return school;
  }

  async createSchool(dto: CreateSchoolDto, actorUserId?: string) {
    // Check if slug or code is duplicate
    const existing = await this.prisma.school.findFirst({
      where: {
        OR: [{ slug: dto.slug }, ...(dto.code ? [{ code: dto.code }] : [])],
      },
    });

    if (existing) {
      throw new BadRequestException('Codice scuola o slug già registrato nel sistema');
    }

    // Default school settings per specification
    const defaultSettings = {
      gradeScale: 'NUMERIC_10',
      gradeEditWindowDays: 7,
      absenceThresholdWarningPercent: 15,
      absenceThresholdLimitPercent: 25,
      maxDailyTests: 1,
      maxWeeklyTests: 3,
      enableParents: true,
      enableNotes: true,
      enableStudentMessaging: false,
    };

    // Generate initial temporary password for SCHOOL_ADMIN
    const tempPassword = this.cryptoService.generateSecureToken(6);
    const passwordHash = await this.cryptoService.hashPassword(tempPassword);
    const activationTokenRaw = this.cryptoService.generateSecureToken(32);
    const activationTokenHash = this.cryptoService.hashToken(activationTokenRaw);

    const result = await this.prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name: dto.name,
          slug: dto.slug.toLowerCase(),
          code: dto.code,
          city: dto.city,
          province: dto.province,
          address: dto.address,
          settings: defaultSettings,
          status: 'ACTIVE',
        },
      });

      const adminUser = await tx.user.create({
        data: {
          schoolId: school.id,
          role: Role.SCHOOL_ADMIN,
          email: dto.adminEmail.toLowerCase(),
          username: dto.adminUsername.toLowerCase(),
          firstName: dto.adminFirstName,
          lastName: dto.adminLastName,
          passwordHash,
          status: 'INVITED',
          mustChangePassword: true,
        },
      });

      await tx.activationToken.create({
        data: {
          userId: adminUser.id,
          tokenHash: activationTokenHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId: school.id,
          actorUserId: actorUserId || null,
          actorRole: Role.SUPER_ADMIN,
          action: 'SCHOOL_CREATED',
          entityType: 'School',
          entityId: school.id,
          after: { schoolName: school.name, adminEmail: adminUser.email },
        },
      });

      return { school, adminUser, activationToken: activationTokenRaw, tempPassword };
    });

    return {
      school: result.school,
      admin: {
        id: result.adminUser.id,
        username: result.adminUser.username,
        email: result.adminUser.email,
        activationToken: result.activationToken,
        temporaryPassword: result.tempPassword,
      },
    };
  }

  async updateSchoolStatus(id: string, status: 'ACTIVE' | 'SUSPENDED', actorUserId?: string) {
    const school = await this.prisma.school.update({
      where: { id },
      data: { status },
    });

    await this.prisma.auditLog.create({
      data: {
        schoolId: school.id,
        actorUserId: actorUserId || null,
        actorRole: Role.SUPER_ADMIN,
        action: status === 'ACTIVE' ? 'SCHOOL_REACTIVATED' : 'SCHOOL_SUSPENDED',
        entityType: 'School',
        entityId: school.id,
      },
    });

    return school;
  }
}
