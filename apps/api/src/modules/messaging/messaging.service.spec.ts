import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessagingService } from './messaging.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@registro/shared';
import { ConversationType } from '@prisma/client';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('MessagingService', () => {
  let service: MessagingService;
  let prismaMock: {
    user: {
      findFirst: ReturnType<typeof vi.fn>;
    };
    conversation: {
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    conversationParticipant: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
    };
    message: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    messageRead: {
      upsert: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    prismaMock = {
      user: {
        findFirst: vi.fn(),
      },
      conversation: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      conversationParticipant: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      message: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      messageRead: {
        upsert: vi.fn(),
      },
    };

    service = new MessagingService(prismaMock as unknown as PrismaService);
  });

  describe('getOrCreateDirectConversation', () => {
    it('throws BadRequestException if recipient is self', async () => {
      await expect(
        service.getOrCreateDirectConversation('school-1', 'user-1', Role.TEACHER, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if recipient is not in school', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(
        service.getOrCreateDirectConversation('school-1', 'user-1', Role.TEACHER, 'user-2'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if student tries to message another student', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: 'student-2',
        role: Role.STUDENT,
        schoolId: 'school-1',
      });

      await expect(
        service.getOrCreateDirectConversation('school-1', 'student-1', Role.STUDENT, 'student-2'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows student to contact a teacher and returns existing conversation if found', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: 'teacher-1',
        role: Role.TEACHER,
        schoolId: 'school-1',
      });

      const existingConv = { id: 'conv-123', type: ConversationType.DIRECT };
      prismaMock.conversation.findFirst.mockResolvedValue(existingConv);

      const res = await service.getOrCreateDirectConversation(
        'school-1',
        'student-1',
        Role.STUDENT,
        'teacher-1',
      );

      expect(res).toEqual(existingConv);
      expect(prismaMock.conversation.create).not.toHaveBeenCalled();
    });

    it('creates new conversation if none exists', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: 'teacher-1',
        role: Role.TEACHER,
        schoolId: 'school-1',
      });
      prismaMock.conversation.findFirst.mockResolvedValue(null);
      prismaMock.conversation.create.mockResolvedValue({
        id: 'conv-new',
        type: ConversationType.DIRECT,
      });

      const res = await service.getOrCreateDirectConversation(
        'school-1',
        'student-1',
        Role.STUDENT,
        'teacher-1',
      );

      expect(res.id).toBe('conv-new');
      expect(prismaMock.conversation.create).toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    it('throws ForbiddenException if user is not conversation participant', async () => {
      prismaMock.conversationParticipant.findFirst.mockResolvedValue(null);

      await expect(
        service.sendMessage('conv-1', 'intruder', { body: 'Hello' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if body contains prohibited language', async () => {
      prismaMock.conversationParticipant.findFirst.mockResolvedValue({ id: 'part-1' });

      await expect(
        service.sendMessage('conv-1', 'user-1', { body: 'Questa è una minaccia grave!' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully sends message and updates conversation timestamp', async () => {
      prismaMock.conversationParticipant.findFirst.mockResolvedValue({ id: 'part-1' });
      prismaMock.message.create.mockResolvedValue({
        id: 'msg-1',
        conversationId: 'conv-1',
        body: 'Buongiorno Professore',
      });

      const res = await service.sendMessage('conv-1', 'user-1', { body: ' Buongiorno Professore ' });

      expect(res.id).toBe('msg-1');
      expect(prismaMock.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            body: 'Buongiorno Professore',
          }),
        }),
      );
      expect(prismaMock.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'conv-1' },
        }),
      );
    });
  });

  describe('deleteMessage', () => {
    it('soft deletes message masking content', async () => {
      prismaMock.message.findFirst.mockResolvedValue({ id: 'msg-1', senderId: 'user-1' });

      const res = await service.deleteMessage('conv-1', 'msg-1', 'user-1');

      expect(res.message).toBe('Messaggio eliminato');
      expect(prismaMock.message.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'msg-1' },
          data: expect.objectContaining({
            body: '[Messaggio rimosso]',
          }),
        }),
      );
    });
  });
});
