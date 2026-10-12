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
});
