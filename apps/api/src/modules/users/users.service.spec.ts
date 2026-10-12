import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsersService } from './users.service';
import { NotFoundException } from '@nestjs/common';
import { Role } from '@registro/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../../common/crypto/crypto.service';

describe('UsersService Tenant Isolation', () => {
  let service: UsersService;
  let prismaMock: {
    user: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    auditLog: {
      create: ReturnType<typeof vi.fn>;
    };
  };
  let cryptoMock: Partial<CryptoService>;

  beforeEach(() => {
    prismaMock = {
      user: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    cryptoMock = {
      generateSecureToken: vi.fn().mockReturnValue('mock-token'),
      hashPassword: vi.fn().mockResolvedValue('mock-hash'),
      hashToken: vi.fn().mockReturnValue('mock-token-hash'),
      encrypt: vi.fn().mockReturnValue('mock-encrypted'),
    };

    service = new UsersService(
      prismaMock as unknown as PrismaService,
      cryptoMock as unknown as CryptoService,
    );
  });

  it('getUser: only retrieves user if schoolId matches tenant', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.getUser('school-A', 'user-belonging-to-school-B'),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'user-belonging-to-school-B',
          schoolId: 'school-A',
        }),
      }),
    );
  });

  it('listUsers: scopes user queries strictly to schoolId', async () => {
    prismaMock.user.count.mockResolvedValueOnce(0);
    prismaMock.user.findMany.mockResolvedValueOnce([]);

    await service.listUsers('school-A', { role: Role.STUDENT });

    expect(prismaMock.user.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schoolId: 'school-A',
          role: Role.STUDENT,
        }),
      }),
    );

    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schoolId: 'school-A',
          role: Role.STUDENT,
        }),
      }),
    );
  });

  it('exportPersonalData: strips sensitive security fields and formats GDPR dossier', async () => {
    const mockUser = {
      id: 'user-123',
      schoolId: 'school-A',
      username: 'mario.rossi',
      email: 'mario@scuola.it',
      firstName: 'Mario',
      lastName: 'Rossi',
      passwordHash: 'secret-hash-argon2id',
      twoFactorSecret: 'totp-secret-key',
      fiscalCode: 'encrypted-cf-val',
      school: { id: 'school-A', name: 'Liceo Da Vinci', code: 'RMIS001' },
      studentProfile: null,
      teacherProfile: null,
      parentLinksAsParent: [],
      sharedNotes: [],
      sentMessages: [],
      notifications: [],
    };

    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser);

    const dossier = await service.exportPersonalData('user-123');

    expect(dossier).toBeDefined();
    expect(dossier.regulation).toContain('GDPR Art. 20');
    expect(dossier.dataSubject.id).toBe('user-123');
    expect(dossier.dataSubject.username).toBe('mario.rossi');
    expect((dossier.dataSubject as any).passwordHash).toBeUndefined();
    expect((dossier.dataSubject as any).twoFactorSecret).toBeUndefined();
    expect((dossier.dataSubject as any).fiscalCode).toBeUndefined();
  });

  it('exportPersonalData: throws NotFoundException if user not found', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    await expect(service.exportPersonalData('unknown-user')).rejects.toThrow(
      NotFoundException,
    );
  });
});
