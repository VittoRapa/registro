import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateDeckDto {
  title: string;
  description?: string;
  subjectId?: string;
  sharedNoteId?: string;
  isPublic?: boolean;
}

export interface CreateCardDto {
  front: string;
  back: string;
  hint?: string;
}

export interface ReviewCardDto {
  grade: number; // 0 to 5
}

@Injectable()
export class FlashcardsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List decks accessible by user (owned or public in same school)
   */
  async listDecks(schoolId: string, userId: string) {
    return this.prisma.flashcardDeck.findMany({
      where: {
        schoolId,
        OR: [{ userId }, { isPublic: true }],
      },
      include: {
        _count: { select: { cards: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Create a new flashcard deck
   */
  async createDeck(schoolId: string, userId: string, dto: CreateDeckDto) {
    return this.prisma.flashcardDeck.create({
      data: {
        schoolId,
        userId,
        title: dto.title,
        description: dto.description || null,
        subjectId: dto.subjectId || null,
        sharedNoteId: dto.sharedNoteId || null,
        isPublic: dto.isPublic || false,
      },
    });
  }

  /**
   * Get deck with cards
   */
  async getDeck(schoolId: string, userId: string, deckId: string) {
    const deck = await this.prisma.flashcardDeck.findFirst({
      where: {
        id: deckId,
        schoolId,
        OR: [{ userId }, { isPublic: true }],
      },
      include: {
        cards: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!deck) {
      throw new NotFoundException('Mazzo di flashcard non trovato');
    }

    return deck;
  }

  /**
   * Add a card to deck
   */
  async addCard(schoolId: string, userId: string, deckId: string, dto: CreateCardDto) {
    const deck = await this.prisma.flashcardDeck.findFirst({
      where: { id: deckId, schoolId, userId },
    });
    if (!deck) {
      throw new ForbiddenException('Non autorizzato a modificare questo mazzo');
    }

    return this.prisma.flashcard.create({
      data: {
        deckId,
        front: dto.front,
        back: dto.back,
        hint: dto.hint || null,
        dueDate: new Date(),
      },
    });
  }

  /**
   * Fetch cards due for review in this deck
   */
  async getDueCards(schoolId: string, userId: string, deckId: string) {
    await this.getDeck(schoolId, userId, deckId);

    return this.prisma.flashcard.findMany({
      where: {
        deckId,
        dueDate: { lte: new Date() },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * SuperMemo SM-2 Spaced Repetition Algorithm
   * grade: 0 (blackout) to 5 (perfect recall)
   */
  calculateSm2(grade: number, repetition: number, interval: number, easeFactor: number) {
    const clampedGrade = Math.max(0, Math.min(5, grade));
    let nextRepetition: number;
    let nextInterval: number;

    if (clampedGrade >= 3) {
      if (repetition === 0) {
        nextInterval = 1;
      } else if (repetition === 1) {
        nextInterval = 6;
      } else {
        nextInterval = Math.round(interval * easeFactor);
      }
      nextRepetition = repetition + 1;
    } else {
      nextRepetition = 0;
      nextInterval = 1;
    }

    // New ease factor: EF' = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
    const nextEaseFactor = Math.max(
      1.3,
      Number(
        (
          easeFactor +
          (0.1 - (5 - clampedGrade) * (0.08 + (5 - clampedGrade) * 0.02))
        ).toFixed(2),
      ),
    );

    const nextDueDate = new Date(Date.now() + nextInterval * 24 * 60 * 60 * 1000);

    return {
      repetition: nextRepetition,
      interval: nextInterval,
      easeFactor: nextEaseFactor,
      dueDate: nextDueDate,
    };
  }

  /**
   * Review a card and apply SM-2 calculation
   */
  async reviewCard(userId: string, cardId: string, grade: number) {
    const card = await this.prisma.flashcard.findUnique({
      where: { id: cardId },
      include: { deck: true },
    });

    if (!card) {
      throw new NotFoundException('Flashcard non trovata');
    }

    if (card.deck.userId !== userId) {
      throw new ForbiddenException('Non puoi recensire le flashcard di un altro utente');
    }

    const sm2 = this.calculateSm2(grade, card.repetition, card.interval, card.easeFactor);

    return this.prisma.flashcard.update({
      where: { id: cardId },
      data: {
        repetition: sm2.repetition,
        interval: sm2.interval,
        easeFactor: sm2.easeFactor,
        dueDate: sm2.dueDate,
        lastReviewedAt: new Date(),
      },
    });
  }
}
