import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { User } from '@prisma/client';
import { Role, UserJwtPayload, LoginDto, ActivateAccountDto, ResetPasswordDto } from '@registro/shared';
import { generateSecret, generateURI, verifySync } from 'otplib';
import * as QRCode from 'qrcode';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    role: Role;
    schoolId?: string | null;
    mustChangePassword: boolean;
    twoFactorEnabled: boolean;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly cryptoService: CryptoService,
  ) {}

  /**
   * Login with username or email, password, and optional TOTP
   */
  async login(
    dto: LoginDto,
    context: { ip?: string; userAgent?: string; schoolId?: string },
  ): Promise<AuthTokens | { requires2Fa: true; tempToken: string }> {
    const { identifier, password, totp } = dto;

    // Search user by email or username (optionally scoped by schoolId if multi-tenant)
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { username: identifier.toLowerCase() },
        ],
        ...(context.schoolId && { schoolId: context.schoolId }),
      },
    });

    if (!user) {
      // Timing attack prevention
      await this.cryptoService.verifyDummy(password);
      throw new UnauthorizedException('Credenziali non valide');
    }

    if (user.status === 'SUSPENDED' || user.status === 'ARCHIVED') {
      throw new ForbiddenException('Account sospeso o archiviato. Contatta la segreteria.');
    }

    const isPasswordValid = await this.cryptoService.verifyPassword(user.passwordHash, password);
    if (!isPasswordValid) {
      // Record failed login audit log
      await this.logAudit({
        schoolId: user.schoolId,
        actorUserId: user.id,
        actorRole: user.role,
        action: 'LOGIN_FAILED',
        entityType: 'User',
        entityId: user.id,
        ip: context.ip,
        userAgent: context.userAgent,
      });
      throw new UnauthorizedException('Credenziali non valide');
    }

    // Two-factor authentication check
    if (user.twoFactorEnabled) {
      if (!totp) {
        // Issue temporary token for 2FA completion (expires in 5 minutes)
        const tempToken = await this.jwtService.signAsync(
          { sub: user.id, role: user.role, is2FaPending: true },
          {
            secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
            expiresIn: '5m',
          },
        );
        return { requires2Fa: true, tempToken };
      }

      // Verify TOTP code
      const decryptedSecret = this.cryptoService.decrypt(user.twoFactorSecret!);
      const verification = verifySync({
        token: totp,
        secret: decryptedSecret,
      });

      if (!verification.valid) {
        // Try backup code
        const backupCodeValid = await this.verifyBackupCode(user.id, totp);
        if (!backupCodeValid) {
          throw new UnauthorizedException('Codice 2FA non valido');
        }
      }
    }

    // Generate tokens
    const tokens = await this.generateTokenFamily(user, context);

    // Update lastLoginAt
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Audit log
    await this.logAudit({
      schoolId: user.schoolId,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'LOGIN_SUCCESS',
      entityType: 'User',
      entityId: user.id,
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return tokens;
  }

  /**
   * Refresh token rotation with reuse detection (spec 7.2)
   */
  async refresh(
    rawRefreshToken: string,
    context: { ip?: string; userAgent?: string },
  ): Promise<AuthTokens> {
    const tokenHash = this.cryptoService.hashToken(rawRefreshToken);

    const existingToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!existingToken) {
      throw new UnauthorizedException('Token di refresh non valido');
    }

    // REUSE DETECTION: If token was already revoked/used, revoke entire token family
    if (existingToken.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: existingToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await this.logAudit({
        schoolId: existingToken.user.schoolId,
        actorUserId: existingToken.userId,
        actorRole: existingToken.user.role,
        action: 'TOKEN_THEFT_DETECTED',
        entityType: 'RefreshToken',
        entityId: existingToken.id,
        ip: context.ip,
        userAgent: context.userAgent,
      });

      throw new UnauthorizedException('Rilevato utilizzo anomalo della sessione. Tutte le sessioni sono state revocate per sicurezza.');
    }

    // Check expiration
    if (new Date() > existingToken.expiresAt) {
      throw new UnauthorizedException('Sessione scaduta, effettua nuovamente l\'accesso');
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: existingToken.id },
      data: { revokedAt: new Date() },
    });

    // Issue new token family
    const tokens = await this.generateTokenFamily(existingToken.user, context, existingToken.id);

    return tokens;
  }

  /**
   * Logout current session
   */
  async logout(sessionId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Logout all user sessions
   */
  async logoutAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Activate account with token and set initial password
   */
  async activate(dto: ActivateAccountDto): Promise<{ message: string }> {
    const tokenHash = this.cryptoService.hashToken(dto.token);

    const activationToken = await this.prisma.activationToken.findUnique({
      where: { tokenHash },
    });

    if (!activationToken || activationToken.usedAt || new Date() > activationToken.expiresAt) {
      throw new BadRequestException('Token di attivazione non valido o scaduto');
    }

    const passwordHash = await this.cryptoService.hashPassword(dto.password);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: activationToken.userId },
        data: {
          passwordHash,
          status: 'ACTIVE',
          mustChangePassword: false,
          consentAt: new Date(),
          consentVersion: '1.0',
        },
      }),
      this.prisma.activationToken.update({
        where: { id: activationToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Account attivato con successo. Ora puoi effettuare il login.' };
  }

  /**
   * Forgot password request (always returns uniform message to prevent enumeration)
   */
  async forgotPassword(identifier: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { username: identifier.toLowerCase() },
        ],
      },
    });

    if (user && user.email) {
      const rawToken = this.cryptoService.generateSecureToken(32);
      const tokenHash = this.cryptoService.hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });
    }

    return {
      message: 'Se l\'account esiste ed è associato a un\'email, riceverai a breve le istruzioni di recupero.',
    };
  }

  /**
   * Reset password with token
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenHash = this.cryptoService.hashToken(dto.token);

    const resetRecord = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetRecord || resetRecord.usedAt || new Date() > resetRecord.expiresAt) {
      throw new BadRequestException('Token di reimpostazione non valido o scaduto');
    }

    const passwordHash = await this.cryptoService.hashPassword(dto.newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetRecord.userId },
        data: {
          passwordHash,
          mustChangePassword: false,
        },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
      // Revoke all existing sessions for security
      this.prisma.refreshToken.updateMany({
        where: { userId: resetRecord.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Password reimpostata con successo. Effettua il login con la nuova password.' };
  }

  /**
   * Setup TOTP 2FA
   */
  async setup2fa(userId: string): Promise<{ secret: string; qrCodeDataUrl: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }

    const secret = generateSecret();
    const appName = 'Registro Elettronico';
    const otpAuthUrl = generateURI({ secret, label: user.username, issuer: appName });
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    return { secret, qrCodeDataUrl };
  }

  /**
   * Enable 2FA after verifying code
   */
  async enable2fa(userId: string, secret: string, code: string): Promise<{ backupCodes: string[] }> {
    const verification = verifySync({ token: code, secret });
    if (!verification.valid) {
      throw new BadRequestException('Codice 2FA di verifica non valido');
    }

    const encryptedSecret = this.cryptoService.encrypt(secret);

    // Generate 10 one-time backup codes
    const plainBackupCodes: string[] = [];
    const backupCodeRecords = [];

    for (let i = 0; i < 10; i++) {
      const codeStr = this.cryptoService.generateSecureToken(4).toUpperCase();
      plainBackupCodes.push(codeStr);
      backupCodeRecords.push({
        userId,
        codeHash: this.cryptoService.hashToken(codeStr),
      });
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: true,
          twoFactorSecret: encryptedSecret,
        },
      }),
      this.prisma.twoFactorBackupCode.deleteMany({ where: { userId } }),
      this.prisma.twoFactorBackupCode.createMany({ data: backupCodeRecords }),
    ]);

    return { backupCodes: plainBackupCodes };
  }

  /**
   * Disable 2FA
   */
  async disable2fa(userId: string, password: string, code: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('2FA non attiva per questo utente');
    }

    const isPasswordValid = await this.cryptoService.verifyPassword(user.passwordHash, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Password non corretta');
    }

    const secret = this.cryptoService.decrypt(user.twoFactorSecret);
    const verification = verifySync({ token: code, secret });
    if (!verification.valid) {
      throw new BadRequestException('Codice 2FA non valido');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
        },
      }),
      this.prisma.twoFactorBackupCode.deleteMany({ where: { userId } }),
    ]);

    return { message: 'Autenticazione a due fattori disattivata con successo' };
  }

  /**
   * List active sessions for user
   */
  async getSessions(userId: string) {
    return this.prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        deviceInfo: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Revoke specific session
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.refreshToken.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new NotFoundException('Sessione non trovata');
    }

    await this.prisma.refreshToken.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Get authenticated user profile
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
          },
        },
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
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      twoFactorEnabled: user.twoFactorEnabled,
      mustChangePassword: user.mustChangePassword,
      school: user.school,
      studentProfile: user.studentProfile,
      teacherProfile: user.teacherProfile,
    };
  }

  // --- Private Helpers ---

  private async generateTokenFamily(
    user: User,
    context: { ip?: string; userAgent?: string },
    replacedTokenId?: string,
  ): Promise<AuthTokens> {
    const rawRefreshToken = this.cryptoService.generateSecureToken(32);
    const tokenHash = this.cryptoService.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Store refresh token
    const refreshTokenRecord = await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        deviceInfo: context.userAgent?.substring(0, 255) || 'Dispositivo sconosciuto',
        expiresAt,
        replacedBy: replacedTokenId,
      },
    });

    // Create JWT access token (15 minutes)
    const payload: UserJwtPayload = {
      sub: user.id,
      sid: refreshTokenRecord.id,
      username: user.username,
      email: user.email || undefined,
      role: user.role,
      schoolId: user.schoolId || undefined,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m',
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role as Role,
        schoolId: user.schoolId,
        mustChangePassword: user.mustChangePassword,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    };
  }

  private async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const codeHash = this.cryptoService.hashToken(code.toUpperCase());
    const record = await this.prisma.twoFactorBackupCode.findFirst({
      where: { userId, codeHash, usedAt: null },
    });

    if (record) {
      await this.prisma.twoFactorBackupCode.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });
      return true;
    }
    return false;
  }

  private async logAudit(data: {
    schoolId?: string | null;
    actorUserId?: string | null;
    actorRole?: string;
    action: string;
    entityType: string;
    entityId?: string;
    ip?: string;
    userAgent?: string;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          schoolId: data.schoolId || null,
          actorUserId: data.actorUserId || null,
          actorRole: data.actorRole,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          ip: data.ip,
          userAgent: data.userAgent,
        },
      });
    } catch {
      // Do not block auth flow on audit log errors
    }
  }
}
