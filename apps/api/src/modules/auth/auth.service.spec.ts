import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CryptoService } from '../../common/crypto/crypto.service';
import { UnauthorizedException } from '@nestjs/common';
import { Role } from '@registro/shared';

describe('AuthService', () => {
  let authService: AuthService;
  let mockPrisma: any;
  let mockJwtService: any;
  let mockConfigService: any;
  let cryptoService: CryptoService;

  beforeEach(async () => {
    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'ENCRYPTION_KEY') {
          return '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
        }
        if (key === 'JWT_ACCESS_SECRET') return 'super-secret-jwt-key-min-32-chars-long!';
        if (key === 'JWT_ACCESS_EXPIRES_IN') return '15m';
        return null;
      }),
    };

    cryptoService = new CryptoService(mockConfigService);

    mockPrisma = {
      user: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      refreshToken: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    };

    mockJwtService = {
      signAsync: vi.fn().mockResolvedValue('mocked.jwt.token'),
    };

    authService = new AuthService(
      mockPrisma as unknown as PrismaService,
      mockJwtService as unknown as JwtService,
      mockConfigService as unknown as ConfigService,
      cryptoService,
    );
  });

  describe('Login', () => {
    it('should throw UnauthorizedException on wrong password', async () => {
      const passwordHash = await cryptoService.hashPassword('CorrectPassword123!');
      mockPrisma.user.findFirst.mockResolvedValueOnce({
        id: 'user-uuid-1',
        username: 'mario.rossi',
        email: 'mario.rossi@scuola.it',
        passwordHash,
        status: 'ACTIVE',
        role: Role.TEACHER,
        twoFactorEnabled: false,
      });

      await expect(
        authService.login(
          { identifier: 'mario.rossi', password: 'WrongPassword!' },
          { ip: '127.0.0.1' },
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should issue tokens on valid login', async () => {
      const password = 'CorrectPassword123!';
      const passwordHash = await cryptoService.hashPassword(password);
      const user = {
        id: 'user-uuid-1',
        username: 'mario.rossi',
        firstName: 'Mario',
        lastName: 'Rossi',
        email: 'mario.rossi@scuola.it',
        passwordHash,
        status: 'ACTIVE',
        role: Role.TEACHER,
        schoolId: 'school-uuid-1',
        mustChangePassword: false,
        twoFactorEnabled: false,
      };

      mockPrisma.user.findFirst.mockResolvedValueOnce(user);
      mockPrisma.refreshToken.create.mockResolvedValueOnce({ id: 'session-uuid-1' });
      mockPrisma.user.update.mockResolvedValueOnce(user);

      const result = await authService.login(
        { identifier: 'mario.rossi', password },
        { ip: '127.0.0.1', userAgent: 'Mozilla/5.0' },
      );

      expect('accessToken' in result).toBe(true);
      if ('accessToken' in result) {
        expect(result.accessToken).toBe('mocked.jwt.token');
        expect(result.refreshToken).toBeDefined();
        expect(result.user.username).toBe('mario.rossi');
      }
    });

    it('should request 2FA if user has 2FA enabled and no totp is provided', async () => {
      const password = 'CorrectPassword123!';
      const passwordHash = await cryptoService.hashPassword(password);
      const user = {
        id: 'user-uuid-1',
        username: 'mario.rossi',
        email: 'mario.rossi@scuola.it',
        passwordHash,
        status: 'ACTIVE',
        role: Role.TEACHER,
        twoFactorEnabled: true,
        twoFactorSecret: cryptoService.encrypt('JBSWY3DPEHPK3PXP'),
      };

      mockPrisma.user.findFirst.mockResolvedValueOnce(user);

      const result = await authService.login(
        { identifier: 'mario.rossi', password },
        { ip: '127.0.0.1' },
      );

      expect('requires2Fa' in result).toBe(true);
      if ('requires2Fa' in result) {
        expect(result.requires2Fa).toBe(true);
        expect(result.tempToken).toBe('mocked.jwt.token');
      }
    });
  });

  describe('Refresh Token Rotation & Theft Detection (spec 7.2)', () => {
    it('should revoke all tokens if an already-revoked refresh token is reused', async () => {
      const rawToken = 'previously-used-token';
      const tokenHash = cryptoService.hashToken(rawToken);

      mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
        id: 'stolen-token-id',
        userId: 'user-uuid-1',
        tokenHash,
        revokedAt: new Date('2026-10-10'), // Already used/revoked!
        expiresAt: new Date(Date.now() + 100000),
        user: { id: 'user-uuid-1', role: Role.STUDENT, schoolId: 'school-1' },
      });

      await expect(
        authService.refresh(rawToken, { ip: 'attacker-ip' }),
      ).rejects.toThrow(UnauthorizedException);

      // Verify that all active tokens for this user were revoked
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1', revokedAt: null },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      });
    });
  });
});
