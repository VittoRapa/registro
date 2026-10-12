import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { Role } from '@registro/shared';

export interface CreateUserDto {
  role: Role;
  firstName: string;
  lastName: string;
  username?: string;
  email?: string;
  birthDate?: string;
  fiscalCode?: string;
  phone?: string;
  // Specific role links
  classId?: string; // For students
  matricola?: string; // For students
  employeeCode?: string; // For teachers
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
}

export interface UserQueryFilters {
  role?: Role;
  classId?: string;
  status?: UserStatus;
  q?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) {}

  /**
   * Search users within tenant with pagination and filters
   */
  async listUsers(schoolId: string, filters: UserQueryFilters) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      schoolId,
      ...(filters.role && { role: filters.role }),
      ...(filters.status && { status: filters.status }),
      ...(filters.q && {
        OR: [
          { firstName: { contains: filters.q, mode: 'insensitive' } },
          { lastName: { contains: filters.q, mode: 'insensitive' } },
          { username: { contains: filters.q, mode: 'insensitive' } },
          { email: { contains: filters.q, mode: 'insensitive' } },
        ],
      }),
      ...(filters.classId && {
        studentProfile: {
          enrollments: {
            some: { classId: filters.classId, status: 'ACTIVE' },
          },
        },
      }),
    };

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          lastLoginAt: true,
          twoFactorEnabled: true,
          createdAt: true,
          studentProfile: {
            select: {
              matricola: true,
              enrollments: {
                where: { status: 'ACTIVE' },
                select: { class: { select: { id: true, name: true } } },
              },
            },
          },
          teacherProfile: {
            select: {
              employeeCode: true,
              teachingAssignments: {
                select: {
                  class: { select: { id: true, name: true } },
                  subject: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
    ]);

    return {
      data: users,
      meta: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: skip + limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Get single user card
   */
  async getUser(schoolId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, schoolId },
      include: {
        studentProfile: {
          include: {
            enrollments: { include: { class: true } },
            parentLinks: {
              include: { parent: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } },
            },
          },
        },
        teacherProfile: {
          include: {
            teachingAssignments: { include: { class: true, subject: true } },
          },
        },
        parentLinksAsParent: {
          include: {
            studentProfile: {
              include: { user: { select: { id: true, firstName: true, lastName: true } } },
            },
          },
        },
        refreshTokens: {
          where: { revokedAt: null, expiresAt: { gt: new Date() } },
          select: { id: true, deviceInfo: true, createdAt: true, expiresAt: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }

    return user;
  }

  /**
   * Create single user (student, teacher, admin, parent)
   */
  async createUser(schoolId: string, dto: CreateUserDto, actorUserId?: string) {
    // Generate suggested username if missing: firstname.lastname
    let username = dto.username?.trim().toLowerCase();
    if (!username) {
      const base = `${dto.firstName.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}.${dto.lastName.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      username = base;
      let counter = 1;
      while (await this.prisma.user.findUnique({ where: { schoolId_username: { schoolId, username } } })) {
        counter++;
        username = `${base}${counter}`;
      }
    } else {
      const exists = await this.prisma.user.findUnique({
        where: { schoolId_username: { schoolId, username } },
      });
      if (exists) {
        throw new BadRequestException(`Username "${username}" già in uso per questa scuola`);
      }
    }

    // Check duplicate email in school
    if (dto.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { schoolId_email: { schoolId, email: dto.email.toLowerCase() } },
      });
      if (emailExists) {
        throw new BadRequestException(`Email "${dto.email}" già in uso per questa scuola`);
      }
    }

    // Generate temporary password & activation token
    const tempPassword = this.cryptoService.generateSecureToken(5); // 10 chars hex
    const passwordHash = await this.cryptoService.hashPassword(tempPassword);
    const rawActivationToken = this.cryptoService.generateSecureToken(32);
    const activationTokenHash = this.cryptoService.hashToken(rawActivationToken);

    // Encrypt fiscal code if provided
    const encryptedFiscalCode = dto.fiscalCode
      ? this.cryptoService.encrypt(dto.fiscalCode.toUpperCase())
      : null;

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          schoolId,
          role: dto.role,
          username,
          email: dto.email ? dto.email.toLowerCase() : null,
          firstName: dto.firstName,
          lastName: dto.lastName,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
          fiscalCode: encryptedFiscalCode,
          phone: dto.phone,
          passwordHash,
          status: 'INVITED',
          mustChangePassword: true,
        },
      });

      // Role profile creation
      if (dto.role === Role.STUDENT) {
        const profile = await tx.studentProfile.create({
          data: {
            userId: user.id,
            matricola: dto.matricola,
          },
        });

        if (dto.classId) {
          await tx.enrollment.create({
            data: {
              studentProfileId: profile.id,
              classId: dto.classId,
              status: 'ACTIVE',
            },
          });
        }
      } else if (dto.role === Role.TEACHER) {
        await tx.teacherProfile.create({
          data: {
            userId: user.id,
            employeeCode: dto.employeeCode,
          },
        });
      }

      await tx.activationToken.create({
        data: {
          userId: user.id,
          tokenHash: activationTokenHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          actorUserId: actorUserId || null,
          actorRole: 'SCHOOL_ADMIN',
          action: 'USER_CREATED',
          entityType: 'User',
          entityId: user.id,
          after: { role: user.role, username: user.username, email: user.email },
        },
      });

      return { user, activationToken: rawActivationToken, tempPassword };
    });

    return {
      user: {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        status: result.user.status,
      },
      credentials: {
        temporaryPassword: result.tempPassword,
        activationToken: result.activationToken,
      },
    };
  }

  /**
   * Update user details
   */
  async updateUser(schoolId: string, id: string, data: UpdateUserDto, actorUserId?: string) {
    const existing = await this.getUser(schoolId, id);

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.email && { email: data.email.toLowerCase() }),
        ...(data.phone && { phone: data.phone }),
        ...(data.birthDate && { birthDate: new Date(data.birthDate) }),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        schoolId,
        actorUserId: actorUserId || null,
        actorRole: 'SCHOOL_ADMIN',
        action: 'USER_UPDATED',
        entityType: 'User',
        entityId: id,
        before: { firstName: existing.firstName, lastName: existing.lastName, email: existing.email },
        after: { firstName: updated.firstName, lastName: updated.lastName, email: updated.email },
      },
    });

    return updated;
  }

  /**
   * Suspend user
   */
  async suspendUser(schoolId: string, id: string, actorUserId?: string) {
    await this.getUser(schoolId, id);

    const user = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id },
        data: { status: 'SUSPENDED' },
      });

      // Revoke all active sessions
      await tx.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          actorUserId: actorUserId || null,
          actorRole: 'SCHOOL_ADMIN',
          action: 'USER_SUSPENDED',
          entityType: 'User',
          entityId: id,
        },
      });

      return u;
    });

    return { message: 'Utente sospeso con successo e sessioni revocate', user };
  }

  /**
   * Reactivate user
   */
  async reactivateUser(schoolId: string, id: string, actorUserId?: string) {
    await this.getUser(schoolId, id);

    const user = await this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    await this.prisma.auditLog.create({
      data: {
        schoolId,
        actorUserId: actorUserId || null,
        actorRole: 'SCHOOL_ADMIN',
        action: 'USER_REACTIVATED',
        entityType: 'User',
        entityId: id,
      },
    });

    return { message: 'Utente riattivato con successo', user };
  }

  /**
   * Reset password by admin (generates temporary password)
   */
  async adminResetPassword(schoolId: string, id: string, actorUserId?: string) {
    await this.getUser(schoolId, id);

    const tempPassword = this.cryptoService.generateSecureToken(5);
    const passwordHash = await this.cryptoService.hashPassword(tempPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          passwordHash,
          mustChangePassword: true,
        },
      });

      await tx.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          actorUserId: actorUserId || null,
          actorRole: 'SCHOOL_ADMIN',
          action: 'USER_PASSWORD_RESET_BY_ADMIN',
          entityType: 'User',
          entityId: id,
        },
      });
    });

    return {
      message: 'Password reimpostata con successo',
      temporaryPassword: tempPassword,
    };
  }

  /**
   * Reset 2FA by admin (after identity verification, spec 7.3)
   */
  async adminReset2fa(schoolId: string, id: string, actorUserId?: string) {
    await this.getUser(schoolId, id);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
        },
      });

      await tx.twoFactorBackupCode.deleteMany({ where: { userId: id } });

      await tx.auditLog.create({
        data: {
          schoolId,
          actorUserId: actorUserId || null,
          actorRole: 'SCHOOL_ADMIN',
          action: 'USER_2FA_RESET_BY_ADMIN',
          entityType: 'User',
          entityId: id,
        },
      });
    });

    return { message: 'Autenticazione a due fattori azzerata per l\'utente' };
  }

  /**
   * Force logout / revoke all sessions by admin
   */
  async forceLogout(schoolId: string, id: string, actorUserId?: string) {
    await this.getUser(schoolId, id);

    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        schoolId,
        actorUserId: actorUserId || null,
        actorRole: 'SCHOOL_ADMIN',
        action: 'USER_SESSIONS_REVOKED_BY_ADMIN',
        entityType: 'User',
        entityId: id,
      },
    });

    return { message: 'Tutte le sessioni dell\'utente sono state revocate' };
  }

  /**
   * GDPR Anonymization (spec 7.8)
   */
  async anonymizeUser(schoolId: string, id: string, actorUserId?: string) {
    const user = await this.getUser(schoolId, id);

    const randomSuffix = this.cryptoService.generateSecureToken(4);
    const anonymizedUsername = `utente.eliminato.${randomSuffix}`;

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          firstName: 'Utente',
          lastName: 'Eliminato',
          username: anonymizedUsername,
          email: null,
          fiscalCode: null,
          phone: null,
          avatarFileId: null,
          twoFactorEnabled: false,
          twoFactorSecret: null,
          status: 'ARCHIVED',
          deletedAt: new Date(),
        },
      });

      await tx.refreshToken.deleteMany({ where: { userId: id } });
      await tx.twoFactorBackupCode.deleteMany({ where: { userId: id } });

      await tx.auditLog.create({
        data: {
          schoolId,
          actorUserId: actorUserId || null,
          actorRole: 'SCHOOL_ADMIN',
          action: 'USER_ANONYMIZED_GDPR',
          entityType: 'User',
          entityId: id,
          before: { username: user.username },
        },
      });
    });

    return { message: 'Dati personali utente anonimizzati nel rispetto del GDPR' };
  }

  /**
   * Get authenticated user profile with role-specific associations
   */
  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        role: true,
        schoolId: true,
        studentProfile: {
          select: {
            id: true,
            matricola: true,
            enrollments: {
              where: { status: 'ACTIVE' },
              select: {
                id: true,
                classId: true,
                class: {
                  select: { id: true, name: true, grade: true, section: true },
                },
              },
            },
          },
        },
        teacherProfile: {
          select: {
            id: true,
            employeeCode: true,
            teachingAssignments: {
              select: {
                id: true,
                classId: true,
                subjectId: true,
                class: { select: { id: true, name: true } },
                subject: { select: { id: true, name: true } },
              },
            },
          },
        },
        parentLinksAsParent: {
          select: {
            id: true,
            relationship: true,
            isPrimary: true,
            canJustify: true,
            studentProfile: {
              select: {
                id: true,
                matricola: true,
                user: {
                  select: { id: true, firstName: true, lastName: true },
                },
                enrollments: {
                  where: { status: 'ACTIVE' },
                  select: {
                    id: true,
                    classId: true,
                    class: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Profilo utente non trovato');
    }

    return user;
  }

  /**
   * GDPR Article 20: Right to Data Portability
   * Exports full dossier of user data as structured JSON
   */
  async exportPersonalData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        school: { select: { id: true, name: true, code: true } },
        studentProfile: {
          include: {
            enrollments: {
              include: { class: { select: { name: true, grade: true, section: true } } },
            },
            grades: {
              include: {
                teachingAssignment: {
                  include: { subject: { select: { name: true } } },
                },
              },
            },
            attendanceRecords: true,
          },
        },
        teacherProfile: {
          include: {
            teachingAssignments: {
              include: {
                class: { select: { name: true } },
                subject: { select: { name: true } },
              },
            },
          },
        },
        parentLinksAsParent: {
          include: {
            studentProfile: {
              include: {
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
        sharedNotes: {
          select: {
            id: true,
            title: true,
            description: true,
            contentType: true,
            createdAt: true,
          },
        },
        sentMessages: {
          select: {
            id: true,
            conversationId: true,
            body: true,
            sentAt: true,
          },
        },
        notifications: {
          select: {
            id: true,
            type: true,
            title: true,
            createdAt: true,
            readAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }

    // Exclude security secrets
    const {
      passwordHash: _passwordHash,
      twoFactorSecret: _twoFactorSecret,
      fiscalCode: _fiscalCode,
      ...safeUser
    } = user;

    return {
      exportTimestamp: new Date().toISOString(),
      regulation: 'Regolamento Generale sulla Protezione dei Dati (UE 2016/679 - GDPR Art. 20)',
      dataSubject: safeUser,
    };
  }
}
