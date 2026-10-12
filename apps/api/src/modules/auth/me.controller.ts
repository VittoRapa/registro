import { Controller, Get, Patch, Body, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLE_PERMISSIONS, Role } from '@registro/shared';

@ApiTags('Auth')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('me')
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Recupera profilo, ruolo e permessi dell\'utente corrente' })
  async getMe(@CurrentUser('id') userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        school: {
          select: { id: true, name: true, slug: true, status: true },
        },
        studentProfile: {
          include: {
            enrollments: {
              where: { status: 'ACTIVE' },
              include: { class: true },
            },
          },
        },
        teacherProfile: {
          include: {
            teachingAssignments: {
              include: { class: true, subject: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }

    const permissions = ROLE_PERMISSIONS[user.role as Role] || [];

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      locale: user.locale,
      schoolId: user.schoolId,
      school: user.school,
      mustChangePassword: user.mustChangePassword,
      twoFactorEnabled: user.twoFactorEnabled,
      studentProfile: user.studentProfile,
      teacherProfile: user.teacherProfile,
      permissions,
    };
  }

  @Patch()
  @ApiOperation({ summary: 'Aggiorna preferenze dell\'utente (lingua, tema, avatar)' })
  async updateMe(
    @CurrentUser('id') userId: string,
    @Body() body: { locale?: string; avatarFileId?: string },
  ) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(body.locale && { locale: body.locale }),
        ...(body.avatarFileId && { avatarFileId: body.avatarFileId }),
      },
    });

    return {
      id: user.id,
      locale: user.locale,
      avatarFileId: user.avatarFileId,
    };
  }
}
