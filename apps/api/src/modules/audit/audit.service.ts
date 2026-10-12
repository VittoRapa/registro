import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditQueryFilters {
  action?: string;
  actorUserId?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(schoolId: string, filters: AuditQueryFilters) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      schoolId,
      ...(filters.action && { action: filters.action }),
      ...(filters.actorUserId && { actorUserId: filters.actorUserId }),
      ...(filters.entityType && { entityType: filters.entityType }),
      ...(filters.startDate && { createdAt: { gte: new Date(filters.startDate) } }),
      ...(filters.endDate && { createdAt: { lte: new Date(filters.endDate) } }),
    };

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          actor: {
            select: { id: true, firstName: true, lastName: true, username: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: logs,
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
   * Export audit log records in RFC 4180 CSV format
   */
  async exportCsv(schoolId: string, filters: AuditQueryFilters = {}): Promise<string> {
    const where: Prisma.AuditLogWhereInput = {
      schoolId,
      ...(filters.action && { action: filters.action }),
      ...(filters.actorUserId && { actorUserId: filters.actorUserId }),
      ...(filters.entityType && { entityType: filters.entityType }),
      ...(filters.startDate && { createdAt: { gte: new Date(filters.startDate) } }),
      ...(filters.endDate && { createdAt: { lte: new Date(filters.endDate) } }),
    };

    const logs = await this.prisma.auditLog.findMany({
      where,
      take: 5000,
      include: {
        actor: { select: { username: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = 'Timestamp,Action,ActorUsername,ActorRole,EntityType,EntityId,IPAddress';
    const rows = logs.map((log) => {
      const escape = (val: string | null | undefined) => `"${(val || '').replace(/"/g, '""')}"`;
      return [
        escape(log.createdAt.toISOString()),
        escape(log.action),
        escape(log.actor?.username || 'Sistema'),
        escape(log.actorRole || log.actor?.role || 'SYSTEM'),
        escape(log.entityType),
        escape(log.entityId),
        escape(log.ip),
      ].join(',');
    });

    return [header, ...rows].join('\r\n');
  }
}
