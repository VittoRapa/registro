import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface CreateAnnouncementDto {
  classId?: string;
  title: string;
  body: string;
  audience?: { roles?: string[]; classIds?: string[] };
  publishAt?: string;
  expiresAt?: string;
  requiresAck?: boolean;
}

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List announcements visible to the school
   */
  async listAnnouncements(schoolId: string) {
    return this.prisma.announcement.findMany({
      where: {
        author: { schoolId },
      },
      include: {
        author: { select: { firstName: true, lastName: true, role: true } },
        class: { select: { id: true, name: true } },
        _count: { select: { reads: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get single announcement
   */
  async getAnnouncement(schoolId: string, id: string) {
    const item = await this.prisma.announcement.findFirst({
      where: { id, author: { schoolId } },
      include: {
        author: { select: { firstName: true, lastName: true, role: true } },
        class: { select: { id: true, name: true } },
      },
    });

    if (!item) {
      throw new NotFoundException('Comunicazione non trovata');
    }

    return item;
  }

  /**
   * Create announcement (Circolare istituzionale)
   */
  async createAnnouncement(
    schoolId: string,
    authorUserId: string,
    dto: CreateAnnouncementDto,
  ) {
    const announcement = await this.prisma.announcement.create({
      data: {
        authorId: authorUserId,
        classId: dto.classId,
        title: dto.title,
        body: dto.body,
        audience: dto.audience ? (dto.audience as Prisma.InputJsonValue) : Prisma.JsonNull,
        publishAt: dto.publishAt ? new Date(dto.publishAt) : new Date(),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        requiresAck: dto.requiresAck || false,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        schoolId,
        actorUserId: authorUserId,
        actorRole: 'SCHOOL_ADMIN',
        action: 'ANNOUNCEMENT_CREATED',
        entityType: 'Announcement',
        entityId: announcement.id,
        after: { title: dto.title },
      },
    });

    return announcement;
  }

  /**
   * Mark announcement as read by user
   */
  async markAsRead(userId: string, announcementId: string) {
    return this.prisma.announcementRead.upsert({
      where: {
        announcementId_userId: {
          announcementId,
          userId,
        },
      },
      create: {
        announcementId,
        userId,
        readAt: new Date(),
      },
      update: {
        readAt: new Date(),
      },
    });
  }

  /**
   * Confirm acknowledgment (presa visione)
   */
  async acknowledge(userId: string, announcementId: string) {
    return this.prisma.announcementRead.upsert({
      where: {
        announcementId_userId: {
          announcementId,
          userId,
        },
      },
      create: {
        announcementId,
        userId,
        readAt: new Date(),
        ackAt: new Date(),
      },
      update: {
        ackAt: new Date(),
      },
    });
  }

  /**
   * Get read and acknowledgment stats for author/admin
   */
  async getReadStats(schoolId: string, announcementId: string) {
    const announcement = await this.getAnnouncement(schoolId, announcementId);

    const reads = await this.prisma.announcementRead.findMany({
      where: { announcementId },
      include: {
        user: { select: { firstName: true, lastName: true, role: true } },
      },
    });

    const totalRead = reads.length;
    const totalAck = reads.filter((r) => r.ackAt !== null).length;

    return {
      announcement,
      totalRead,
      totalAck,
      reads,
    };
  }
}
