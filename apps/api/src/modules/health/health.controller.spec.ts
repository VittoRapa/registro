import { describe, it, expect, vi } from 'vitest';
import { HealthController } from './health.controller';
import { PrismaService } from '../../prisma/prisma.service';

describe('HealthController', () => {
  const mockPrismaService = {
    $queryRaw: vi.fn(),
  } as unknown as PrismaService;

  const controller = new HealthController(mockPrismaService);

  it('checkLiveness should return status ok with ISO timestamp', () => {
    const result = controller.checkLiveness();
    expect(result.status).toBe('ok');
    expect(result.timestamp).toBeDefined();
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  it('checkReadiness should return healthy when database responds', async () => {
    vi.mocked(mockPrismaService.$queryRaw).mockResolvedValueOnce([{ 1: 1 }]);
    const result = await controller.checkReadiness();
    expect(result.status).toBe('ok');
    expect(result.database).toBe('healthy');
  });

  it('checkReadiness should return degraded when database fails', async () => {
    vi.mocked(mockPrismaService.$queryRaw).mockRejectedValueOnce(new Error('Connection refused'));
    const result = await controller.checkReadiness();
    expect(result.status).toBe('degraded');
    expect(result.database).toBe('unhealthy');
  });
});
