import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateNotificationDto {
  schoolId?: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  channel?: string;
}

export interface UpdatePreferenceDto {
  type: string;
  email?: boolean;
  inApp?: boolean;
  push?: boolean;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List notifications for user
   */
  async listNotifications(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { readAt: null }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Mark single notification as read
   */
  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notification) {
      throw new NotFoundException('Notifica non trovata');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { message: 'Tutte le notifiche sono state contrassegnate come lette' };
  }

  /**
   * Get user notification preferences
   */
  async getPreferences(userId: string) {
    return this.prisma.notificationPreference.findMany({
      where: { userId },
    });
  }

  /**
   * Update or create notification preference
   */
  async updatePreference(userId: string, dto: UpdatePreferenceDto) {
    return this.prisma.notificationPreference.upsert({
      where: { userId_type: { userId, type: dto.type } },
      create: {
        userId,
        type: dto.type,
        email: dto.email !== undefined ? dto.email : true,
        inApp: dto.inApp !== undefined ? dto.inApp : true,
        push: dto.push !== undefined ? dto.push : true,
      },
      update: {
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.inApp !== undefined && { inApp: dto.inApp }),
        ...(dto.push !== undefined && { push: dto.push }),
      },
    });
  }

  /**
   * Internal dispatcher: emit in-app notification
   */
  async emitNotification(userId: string, dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        userId,
        schoolId: dto.schoolId || null,
        type: dto.type,
        title: dto.title,
        body: dto.body || null,
        data: dto.data ? (dto.data as unknown as Prisma.InputJsonValue) : undefined,
        channel: dto.channel || 'IN_APP',
      },
    });
  }
}
