import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService } from './audit.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuditService', () => {
  let service: AuditService;
  let prismaMock: {
    auditLog: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    prismaMock = {
      auditLog: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };

    service = new AuditService(prismaMock as unknown as PrismaService);
  });

  it('exportCsv: formats RFC 4180 compliant CSV and quotes special characters', async () => {
    const mockLogs = [
      {
        createdAt: new Date('2026-10-12T14:30:00.000Z'),
        action: 'GRADE_CREATED',
        actor: { username: 'docente.bianchi', role: 'TEACHER' },
        actorRole: 'TEACHER',
        entityType: 'Grade',
        entityId: 'grade-123',
        ip: '192.168.1.50',
      },
      {
        createdAt: new Date('2026-10-12T15:00:00.000Z'),
        action: 'USER_LOGIN',
        actor: { username: 'admin,"special"', role: 'SCHOOL_ADMIN' },
        actorRole: 'SCHOOL_ADMIN',
        entityType: 'User',
        entityId: 'usr-999',
        ip: null,
      },
    ];

    prismaMock.auditLog.findMany.mockResolvedValueOnce(mockLogs);

    const csv = await service.exportCsv('school-1');

    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ schoolId: 'school-1' }),
        take: 5000,
      }),
    );

    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('Timestamp,Action,ActorUsername,ActorRole,EntityType,EntityId,IPAddress');

    // First line
    expect(lines[1]).toContain('"2026-10-12T14:30:00.000Z"');
    expect(lines[1]).toContain('"GRADE_CREATED"');
    expect(lines[1]).toContain('"docente.bianchi"');
    expect(lines[1]).toContain('"TEACHER"');
    expect(lines[1]).toContain('"Grade"');
    expect(lines[1]).toContain('"grade-123"');
    expect(lines[1]).toContain('"192.168.1.50"');

    // Second line has escaped double quotes in username: admin,"special" -> "admin,""special"""
    expect(lines[2]).toContain('"admin,""special"""');
  });

  it('list: filters by action and date range within tenant schoolId', async () => {
    prismaMock.auditLog.count.mockResolvedValueOnce(1);
    prismaMock.auditLog.findMany.mockResolvedValueOnce([]);

    await service.list('school-1', {
      action: 'GRADE_CREATED',
      page: 1,
      limit: 20,
    });

    expect(prismaMock.auditLog.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schoolId: 'school-1',
          action: 'GRADE_CREATED',
        }),
      }),
    );

    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schoolId: 'school-1',
          action: 'GRADE_CREATED',
        }),
        skip: 0,
        take: 20,
      }),
    );
  });
});
