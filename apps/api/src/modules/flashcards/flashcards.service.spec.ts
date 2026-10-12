import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FlashcardsService } from './flashcards.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

describe('FlashcardsService & SuperMemo SM-2', () => {
  let service: FlashcardsService;
  let prismaMock: {
    flashcardDeck: {
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
    };
    flashcard: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    prismaMock = {
      flashcardDeck: {
        findMany: vi.fn(),
        create: vi.fn(),
        findFirst: vi.fn(),
      },
      flashcard: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };

    service = new FlashcardsService(prismaMock as unknown as PrismaService);
  });

  describe('SM-2 Algorithm Direct Calculation', () => {
    it('SM-2: first successful review (grade 5) sets interval to 1 day and increments repetition', () => {
      const result = service.calculateSm2(5, 0, 0, 2.5);

      expect(result.repetition).toBe(1);
      expect(result.interval).toBe(1);
      expect(result.easeFactor).toBeGreaterThanOrEqual(2.5);
      expect(result.dueDate.getTime()).toBeGreaterThan(Date.now());
    });

    it('SM-2: second successful review sets interval to 6 days', () => {
      const result = service.calculateSm2(4, 1, 1, 2.5);

      expect(result.repetition).toBe(2);
      expect(result.interval).toBe(6);
      expect(result.easeFactor).toBe(2.5);
    });

    it('SM-2: third successful review multiplies interval by easeFactor', () => {
      const result = service.calculateSm2(5, 2, 6, 2.5);

      expect(result.repetition).toBe(3);
      expect(result.interval).toBe(Math.round(6 * 2.5)); // 15 days
      expect(result.easeFactor).toBe(2.6); // 2.5 + (0.1 - 0) = 2.6
    });

    it('SM-2: failing grade (< 3) resets repetition to 0 and interval to 1 day', () => {
      const result = service.calculateSm2(1, 3, 15, 2.5);

      expect(result.repetition).toBe(0);
      expect(result.interval).toBe(1);
      expect(result.easeFactor).toBeLessThan(2.5);
    });

    it('SM-2: easeFactor never drops below 1.3 threshold', () => {
      let ef = 1.35;
      for (let i = 0; i < 5; i++) {
        const res = service.calculateSm2(0, 0, 1, ef);
        ef = res.easeFactor;
      }

      expect(ef).toBe(1.3);
    });
  });

  describe('Review card execution & security', () => {
    it('reviewCard: throws ForbiddenException if user does not own the deck', async () => {
      prismaMock.flashcard.findUnique.mockResolvedValueOnce({
        id: 'card-1',
        deck: { userId: 'different-user-id' },
      });

      await expect(
        service.reviewCard('my-user-id', 'card-1', 4),
      ).rejects.toThrow(ForbiddenException);
    });

    it('reviewCard: throws NotFoundException if card does not exist', async () => {
      prismaMock.flashcard.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.reviewCard('my-user-id', 'non-existent-card', 4),
      ).rejects.toThrow(NotFoundException);
    });

    it('reviewCard: updates card with calculated SM-2 schedule', async () => {
      const mockCard = {
        id: 'card-1',
        repetition: 0,
        interval: 0,
        easeFactor: 2.5,
        deck: { userId: 'my-user-id' },
      };
      prismaMock.flashcard.findUnique.mockResolvedValueOnce(mockCard);
      prismaMock.flashcard.update.mockResolvedValueOnce({ id: 'card-1' });

      await service.reviewCard('my-user-id', 'card-1', 5);

      expect(prismaMock.flashcard.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'card-1' },
          data: expect.objectContaining({
            repetition: 1,
            interval: 1,
            easeFactor: 2.6,
          }),
        }),
      );
    });
  });
});
