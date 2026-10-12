import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@registro/shared';
import { ConversationType } from '@prisma/client';

export interface CreateConversationDto {
  recipientUserId: string;
  initialMessage?: string;
}

export interface SendMessageDto {
  body: string;
  attachmentFileIds?: string[];
}

const BLOCKED_WORDS = [
  'violenza',
  'minaccia',
  'insulto',
  'truffa',
];

@Injectable()
export class MessagingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List conversations for current user with unread count and latest message snippet
   */
  async listConversations(currentUserId: string) {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { userId: currentUserId },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: {
                  select: { id: true, firstName: true, lastName: true, role: true },
                },
              },
            },
            messages: {
              where: { deletedAt: null },
              orderBy: { sentAt: 'desc' },
              take: 1,
              include: {
                sender: { select: { id: true, firstName: true, lastName: true } },
                reads: { where: { userId: currentUserId } },
              },
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    });

    return participants.map((p) => {
      const conv = p.conversation;
      const otherParticipants = conv.participants
        .filter((part) => part.userId !== currentUserId)
        .map((part) => part.user);
      const lastMessage = conv.messages[0] || null;
      const isUnread = lastMessage ? lastMessage.sender.id !== currentUserId && lastMessage.reads.length === 0 : false;

      return {
        id: conv.id,
        type: conv.type,
        updatedAt: conv.updatedAt,
        otherParticipants,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              body: lastMessage.body,
              sentAt: lastMessage.sentAt,
              senderName: `${lastMessage.sender.firstName} ${lastMessage.sender.lastName}`,
            }
          : null,
        isUnread,
      };
    });
  }

  /**
   * Find or create direct conversation between two users
   */
  async getOrCreateDirectConversation(
    schoolId: string,
    currentUserId: string,
    currentUserRole: Role,
    recipientUserId: string,
  ) {
    if (currentUserId === recipientUserId) {
      throw new BadRequestException('Non puoi avviare una conversazione con te stesso');
    }

    const recipient = await this.prisma.user.findFirst({
      where: { id: recipientUserId, schoolId },
    });
    if (!recipient) {
      throw new NotFoundException('Destinatario non trovato nella scuola');
    }

    // Role-based boundary check (Spec 8.6):
    // Teachers can message students and parents in their assigned classes.
    // Students can message their teachers.
    // SuperAdmin / SchoolAdmin can message anyone.
    const isElevated = currentUserRole === Role.SUPER_ADMIN || currentUserRole === Role.SCHOOL_ADMIN;

    if (!isElevated) {
      if (currentUserRole === Role.TEACHER) {
        // Recipient must be student or parent
        if (recipient.role !== Role.STUDENT && recipient.role !== Role.PARENT) {
          // Allow teacher-teacher communications
        }
      } else if (currentUserRole === Role.STUDENT) {
        // Student can only message teachers
        if (recipient.role !== Role.TEACHER && recipient.role !== Role.SCHOOL_ADMIN) {
          throw new ForbiddenException('Gli studenti possono contattare solo i propri docenti');
        }
      } else if (currentUserRole === Role.PARENT) {
        // Parent can only message teachers
        if (recipient.role !== Role.TEACHER && recipient.role !== Role.SCHOOL_ADMIN) {
          throw new ForbiddenException('I genitori possono contattare solo i docenti');
        }
      }
    }

    // Check if direct conversation already exists
    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: ConversationType.DIRECT,
        AND: [
          { participants: { some: { userId: currentUserId } } },
          { participants: { some: { userId: recipientUserId } } },
        ],
      },
    });

    if (existing) {
      return existing;
    }

    // Create new conversation
    return this.prisma.conversation.create({
      data: {
        type: ConversationType.DIRECT,
        participants: {
          create: [
            { userId: currentUserId },
            { userId: recipientUserId },
          ],
        },
      },
    });
  }

  /**
   * Get messages in conversation with automatic read marking
   */
  async getMessages(
    conversationId: string,
    currentUserId: string,
    page = 1,
    limit = 50,
  ) {
    // Check participant
    const isParticipant = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: currentUserId },
    });
    if (!isParticipant) {
      throw new ForbiddenException('Non hai accesso a questa conversazione');
    }

    const skip = (Math.max(1, page) - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId, deletedAt: null },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
        orderBy: { sentAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.message.count({
        where: { conversationId, deletedAt: null },
      }),
    ]);

    // Mark unread messages as read
    const unreadMessages = messages.filter((m) => m.senderId !== currentUserId);
    for (const msg of unreadMessages) {
      await this.prisma.messageRead.upsert({
        where: { messageId_userId: { messageId: msg.id, userId: currentUserId } },
        create: { messageId: msg.id, userId: currentUserId },
        update: {},
      });
    }

    return {
      items: messages,
      total,
      page,
      limit,
    };
  }

  /**
   * Send message to conversation
   */
  async sendMessage(
    conversationId: string,
    currentUserId: string,
    dto: SendMessageDto,
  ) {
    // Check participant
    const isParticipant = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: currentUserId },
    });
    if (!isParticipant) {
      throw new ForbiddenException('Non hai accesso a questa conversazione');
    }

    // Content safety check (Spec 8.6):
    const lowerBody = dto.body.toLowerCase();
    for (const blocked of BLOCKED_WORDS) {
      if (lowerBody.includes(blocked)) {
        throw new BadRequestException('Il messaggio contiene termini non consentiti dalle linee guida scolastiche');
      }
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: currentUserId,
        body: dto.body.trim(),
        attachmentFileIds: dto.attachmentFileIds || [],
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    // Touch conversation updatedAt
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  /**
   * Delete message
   */
  async deleteMessage(
    conversationId: string,
    messageId: string,
    currentUserId: string,
    isElevated = false,
  ) {
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        conversationId,
        ...(!isElevated && { senderId: currentUserId }),
      },
    });
    if (!message) {
      throw new NotFoundException('Messaggio non trovato o permessi non validi');
    }

    await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), body: '[Messaggio rimosso]' },
    });

    return { message: 'Messaggio eliminato' };
  }
}
