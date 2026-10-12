import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SharedNotesService } from './shared-notes.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NoteStatus,
  NoteVisibility,
  NoteReportReason,
  Role,
  Prisma,
} from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';

describe('SharedNotesService', () => {
  let service: SharedNotesService;
  let prismaMock: {
    sharedNote: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    noteRating: {
      findMany: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
    noteReport: {
      create: ReturnType<typeof vi.fn>;
      groupBy: ReturnType<typeof vi.fn>;
    };
    noteBookmark: {
      upsert: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
    noteComment: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    noteTag: {
      upsert: ReturnType<typeof vi.fn>;
    };
    sharedNoteTag: {
      deleteMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    file: {
      findMany: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    prismaMock = {
      sharedNote: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      noteRating: {
        findMany: vi.fn(),
        upsert: vi.fn(),
        deleteMany: vi.fn(),
      },
      noteReport: {
        create: vi.fn(),
        groupBy: vi.fn(),
      },
      noteBookmark: {
        upsert: vi.fn(),
        deleteMany: vi.fn(),
      },
      noteComment: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      noteTag: {
        upsert: vi.fn(),
      },
      sharedNoteTag: {
        deleteMany: vi.fn(),
        create: vi.fn(),
      },
      file: {
        findMany: vi.fn(),
      },
    };

    service = new SharedNotesService(prismaMock as unknown as PrismaService);
  });

  describe('Bayesian rating calculation', () => {
    it('calculates weighted Bayesian average score correctly: (C*m + sum)/(C + n) with C=5, m=3.5', async () => {
      const noteId = 'note-100';
      const userId = 'user-student-1';

      prismaMock.noteRating.upsert.mockResolvedValueOnce({ noteId, userId, stars: 5 });
      // Ratings: [5, 4] -> sum = 9, n = 2
      // Bayesian = (5 * 3.5 + 9) / (5 + 2) = (17.5 + 9) / 7 = 26.5 / 7 = 3.7857... -> 3.79
      prismaMock.noteRating.findMany.mockResolvedValueOnce([
        { stars: 5 },
        { stars: 4 },
      ]);
      prismaMock.sharedNote.update.mockResolvedValueOnce({
        id: noteId,
        avgRating: new Prisma.Decimal(3.79),
        ratingCount: 2,
      });
      prismaMock.sharedNote.findUnique.mockResolvedValueOnce({
        avgRating: new Prisma.Decimal(3.79),
        ratingCount: 2,
      });

      const result = await service.rateNote(noteId, userId, 5);

      expect(prismaMock.sharedNote.update).toHaveBeenCalledWith({
        where: { id: noteId },
        data: {
          avgRating: new Prisma.Decimal((26.5 / 7).toFixed(2)),
          ratingCount: 2,
        },
      });
      expect(result.avgRating).toBe(3.79);
      expect(result.ratingCount).toBe(2);
    });

    it('sets avgRating to 0 when all ratings are deleted', async () => {
      const noteId = 'note-101';
      const userId = 'user-student-1';

      prismaMock.noteRating.deleteMany.mockResolvedValueOnce({ count: 1 });
      prismaMock.noteRating.findMany.mockResolvedValueOnce([]); // Empty
      prismaMock.sharedNote.update.mockResolvedValueOnce({
        id: noteId,
        avgRating: new Prisma.Decimal(0),
        ratingCount: 0,
      });

      await service.deleteRating(noteId, userId);

      expect(prismaMock.sharedNote.update).toHaveBeenCalledWith({
        where: { id: noteId },
        data: {
          avgRating: new Prisma.Decimal(0),
          ratingCount: 0,
        },
      });
    });
  });

  describe('Auto-moderation threshold (3 distinct reports)', () => {
    it('automatically sets status to HIDDEN when 3 distinct users report a note', async () => {
      const schoolId = 'school-1';
      const noteId = 'note-200';
      const reporterId = 'user-reporter-3';

      prismaMock.sharedNote.findFirst.mockResolvedValueOnce({
        id: noteId,
        schoolId,
        status: NoteStatus.PUBLISHED,
      });

      prismaMock.noteReport.create.mockResolvedValueOnce({
        id: 'report-3',
        noteId,
        reporterId,
        reason: NoteReportReason.INAPPROPRIATO,
      });

      // 3 distinct reporters
      prismaMock.noteReport.groupBy.mockResolvedValueOnce([
        { reporterId: 'user-reporter-1' },
        { reporterId: 'user-reporter-2' },
        { reporterId: 'user-reporter-3' },
      ]);

      prismaMock.sharedNote.update.mockResolvedValueOnce({
        id: noteId,
        status: NoteStatus.HIDDEN,
      });

      const result = await service.reportNote(schoolId, noteId, reporterId, {
        reason: NoteReportReason.INAPPROPRIATO,
        details: 'Contenuto offensivo',
      });

      expect(result.autoHidden).toBe(true);
      expect(result.distinctReportsCount).toBe(3);
      expect(prismaMock.sharedNote.update).toHaveBeenCalledWith({
        where: { id: noteId },
        data: { status: NoteStatus.HIDDEN },
      });
    });

    it('does NOT hide note when fewer than 3 distinct users report it', async () => {
      const schoolId = 'school-1';
      const noteId = 'note-201';
      const reporterId = 'user-reporter-2';

      prismaMock.sharedNote.findFirst.mockResolvedValueOnce({
        id: noteId,
        schoolId,
        status: NoteStatus.PUBLISHED,
      });

      prismaMock.noteReport.create.mockResolvedValueOnce({
        id: 'report-2',
        noteId,
        reporterId,
        reason: NoteReportReason.SPAM,
      });

      // 2 distinct reporters
      prismaMock.noteReport.groupBy.mockResolvedValueOnce([
        { reporterId: 'user-reporter-1' },
        { reporterId: 'user-reporter-2' },
      ]);

      const result = await service.reportNote(schoolId, noteId, reporterId, {
        reason: NoteReportReason.SPAM,
      });

      expect(result.autoHidden).toBe(false);
      expect(result.distinctReportsCount).toBe(2);
      expect(prismaMock.sharedNote.update).not.toHaveBeenCalled();
    });
  });

  describe('Privacy isolation for PRIVATE notes', () => {
    it('throws ForbiddenException when another user (even a teacher) tries to fetch a PRIVATE note', async () => {
      const schoolId = 'school-1';
      const noteId = 'note-private-1';
      const authorId = 'student-alice';
      const viewerId = 'teacher-bob';

      prismaMock.sharedNote.findFirst.mockResolvedValueOnce({
        id: noteId,
        schoolId,
        authorId,
        visibility: NoteVisibility.PRIVATE,
        status: NoteStatus.PUBLISHED,
        fileIds: [],
        tags: [],
        ratings: [],
        bookmarks: [],
        _count: { comments: 0, ratings: 0 },
        avgRating: new Prisma.Decimal(0),
        author: { id: authorId, firstName: 'Alice', lastName: 'Rossi', role: Role.STUDENT },
      });

      await expect(
        service.getNote(schoolId, noteId, viewerId, Role.TEACHER, 'class-1', 3),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows author to access their own PRIVATE note', async () => {
      const schoolId = 'school-1';
      const noteId = 'note-private-1';
      const authorId = 'student-alice';

      prismaMock.sharedNote.findFirst.mockResolvedValueOnce({
        id: noteId,
        schoolId,
        authorId,
        visibility: NoteVisibility.PRIVATE,
        status: NoteStatus.PUBLISHED,
        fileIds: [],
        tags: [],
        ratings: [],
        bookmarks: [],
        _count: { comments: 0, ratings: 0 },
        avgRating: new Prisma.Decimal(0),
        author: { id: authorId, firstName: 'Alice', lastName: 'Rossi', role: Role.STUDENT },
      });

      prismaMock.sharedNote.update.mockResolvedValueOnce({ id: noteId }); // viewCount increment

      const result = await service.getNote(
        schoolId,
        noteId,
        authorId,
        Role.STUDENT,
        'class-1',
        3,
      );

      expect(result.id).toBe(noteId);
      expect(result.visibility).toBe(NoteVisibility.PRIVATE);
    });
  });

  describe('Teacher verification toggle', () => {
    it('marks note as verified by teacher when not yet verified', async () => {
      const schoolId = 'school-1';
      const noteId = 'note-ver-1';
      const teacherUserId = 'teacher-10';

      prismaMock.sharedNote.findFirst.mockResolvedValueOnce({
        id: noteId,
        schoolId,
        verifiedAt: null,
        verifiedByTeacherId: null,
      });

      const fixedDate = new Date();
      prismaMock.sharedNote.update.mockResolvedValueOnce({
        id: noteId,
        verifiedByTeacherId: teacherUserId,
        verifiedAt: fixedDate,
      });

      const result = await service.toggleVerification(schoolId, noteId, teacherUserId);

      expect(result.verified).toBe(true);
      expect(prismaMock.sharedNote.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: noteId },
          data: expect.objectContaining({
            verifiedByTeacherId: teacherUserId,
          }),
        }),
      );
    });

    it('removes verification if note is already verified', async () => {
      const schoolId = 'school-1';
      const noteId = 'note-ver-2';
      const teacherUserId = 'teacher-10';

      prismaMock.sharedNote.findFirst.mockResolvedValueOnce({
        id: noteId,
        schoolId,
        verifiedAt: new Date(),
        verifiedByTeacherId: teacherUserId,
      });

      prismaMock.sharedNote.update.mockResolvedValueOnce({
        id: noteId,
        verifiedByTeacherId: null,
        verifiedAt: null,
      });

      const result = await service.toggleVerification(schoolId, noteId, teacherUserId);

      expect(result.verified).toBe(false);
      expect(prismaMock.sharedNote.update).toHaveBeenCalledWith({
        where: { id: noteId },
        data: {
          verifiedByTeacherId: null,
          verifiedAt: null,
        },
      });
    });
  });
});
