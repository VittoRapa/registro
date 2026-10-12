import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NoteVisibility,
  NoteStatus,
  NoteLicense,
  NoteReportReason,
  NoteReportStatus,
  Prisma,
  Role,
} from '@prisma/client';

export interface SharedNoteFilters {
  subjectId?: string;
  classId?: string;
  grade?: number;
  tag?: string;
  type?: 'FILE' | 'MARKDOWN';
  verified?: boolean;
  q?: string;
  sort?: 'recent' | 'rating' | 'downloads' | 'views';
  page?: number;
  limit?: number;
}

export interface CreateSharedNoteDto {
  title: string;
  description?: string;
  subjectId?: string;
  classId?: string;
  grade?: number;
  contentType?: 'FILE' | 'MARKDOWN';
  markdownBody?: string;
  fileIds?: string[];
  visibility?: NoteVisibility;
  license?: NoteLicense;
  status?: NoteStatus;
  tags?: string[];
}

export interface UpdateSharedNoteDto {
  title?: string;
  description?: string;
  subjectId?: string;
  classId?: string;
  grade?: number;
  markdownBody?: string;
  fileIds?: string[];
  visibility?: NoteVisibility;
  tags?: string[];
}

export interface CreateCommentDto {
  body: string;
  parentId?: string;
}

export interface ReportNoteDto {
  reason: NoteReportReason;
  details?: string;
}

const BAYESIAN_C = 5;
const BAYESIAN_PRIOR_MEAN = 3.5;

@Injectable()
export class SharedNotesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Explore notes with multi-factor search and strict privacy scoping
   */
  async listNotes(
    schoolId: string,
    currentUserId: string,
    currentUserRole: Role,
    userClassId: string | undefined,
    userGrade: number | undefined,
    filters: SharedNoteFilters,
  ) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    // Visibility Scoping Filter:
    // 1. Author can always see their own notes (even PRIVATE and DRAFT).
    // 2. Others can ONLY see PUBLISHED notes matching their visibility level:
    //    - SCHOOL visibility: everyone in the school.
    //    - GRADE_LEVEL visibility: users in the same grade (or teachers/admins).
    //    - CLASS visibility: users in the same class (or teachers/admins).
    // 3. PRIVATE notes are NEVER visible to anyone except the author!
    const visibilityConditions: Prisma.SharedNoteWhereInput[] = [
      { authorId: currentUserId }, // My own notes (any status/visibility)
    ];

    const isElevated =
      currentUserRole === Role.TEACHER ||
      currentUserRole === Role.SCHOOL_ADMIN ||
      currentUserRole === Role.SUPER_ADMIN;

    if (isElevated) {
      // Teachers and Admins can see all PUBLISHED notes (except PRIVATE ones)
      visibilityConditions.push({
        status: NoteStatus.PUBLISHED,
        visibility: { in: [NoteVisibility.SCHOOL, NoteVisibility.GRADE_LEVEL, NoteVisibility.CLASS] },
      });
    } else {
      // Students can see:
      // a) SCHOOL visible notes
      visibilityConditions.push({
        status: NoteStatus.PUBLISHED,
        visibility: NoteVisibility.SCHOOL,
      });

      // b) GRADE_LEVEL visible notes for their grade
      if (userGrade) {
        visibilityConditions.push({
          status: NoteStatus.PUBLISHED,
          visibility: NoteVisibility.GRADE_LEVEL,
          grade: userGrade,
        });
      }

      // c) CLASS visible notes for their class
      if (userClassId) {
        visibilityConditions.push({
          status: NoteStatus.PUBLISHED,
          visibility: NoteVisibility.CLASS,
          classId: userClassId,
        });
      }
    }

    const where: Prisma.SharedNoteWhereInput = {
      schoolId,
      OR: visibilityConditions,
      ...(filters.subjectId && { subjectId: filters.subjectId }),
      ...(filters.classId && { classId: filters.classId }),
      ...(filters.grade && { grade: Number(filters.grade) }),
      ...(filters.type && { contentType: filters.type }),
      ...(filters.verified !== undefined && {
        verifiedAt: filters.verified ? { not: null } : null,
      }),
      ...(filters.q && {
        OR: [
          { title: { contains: filters.q, mode: 'insensitive' } },
          { description: { contains: filters.q, mode: 'insensitive' } },
          { markdownBody: { contains: filters.q, mode: 'insensitive' } },
        ],
      }),
      ...(filters.tag && {
        tags: { some: { tag: { name: { equals: filters.tag, mode: 'insensitive' } } } },
      }),
    };

    let orderBy: Prisma.SharedNoteOrderByWithRelationInput = { createdAt: 'desc' };
    if (filters.sort === 'rating') {
      orderBy = { avgRating: 'desc' };
    } else if (filters.sort === 'downloads') {
      orderBy = { downloadCount: 'desc' };
    } else if (filters.sort === 'views') {
      orderBy = { viewCount: 'desc' };
    }

    const [items, total] = await Promise.all([
      this.prisma.sharedNote.findMany({
        where,
        include: {
          author: { select: { id: true, firstName: true, lastName: true, role: true } },
          subject: { select: { id: true, name: true, color: true } },
          class: { select: { id: true, name: true } },
          tags: { include: { tag: true } },
          _count: { select: { comments: true, ratings: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.sharedNote.count({ where }),
    ]);

    return {
      data: items.map((item) => ({
        ...item,
        avgRating: Number(item.avgRating),
        tags: item.tags.map((t) => t.tag.name),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Create a new shared note (Markdown or File-based)
   */
  async createNote(
    schoolId: string,
    authorId: string,
    authorRole: Role,
    dto: CreateSharedNoteDto,
  ) {
    const isTeacher = authorRole === Role.TEACHER;

    const note = await this.prisma.sharedNote.create({
      data: {
        schoolId,
        authorId,
        subjectId: dto.subjectId || null,
        classId: dto.classId || null,
        grade: dto.grade || null,
        title: dto.title,
        description: dto.description || null,
        contentType: dto.contentType || 'FILE',
        markdownBody: dto.markdownBody || null,
        fileIds: dto.fileIds || [],
        visibility: dto.visibility || NoteVisibility.CLASS,
        license: dto.license || NoteLicense.ORIGINALE,
        status: dto.status || NoteStatus.PUBLISHED,
        verifiedByTeacherId: isTeacher ? authorId : null,
        verifiedAt: isTeacher ? new Date() : null,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        subject: true,
      },
    });

    // Process tags
    if (dto.tags && dto.tags.length > 0) {
      await this.syncTags(note.id, dto.tags);
    }

    return note;
  }

  /**
   * Get single note details with visibility verification and view increment
   */
  async getNote(
    schoolId: string,
    noteId: string,
    currentUserId: string,
    currentUserRole: Role,
    userClassId?: string,
    userGrade?: number,
  ) {
    const note = await this.prisma.sharedNote.findFirst({
      where: { id: noteId, schoolId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
        subject: true,
        class: true,
        tags: { include: { tag: true } },
        ratings: { where: { userId: currentUserId } },
        bookmarks: { where: { userId: currentUserId } },
        _count: { select: { comments: true, ratings: true } },
      },
    });

    if (!note) {
      throw new NotFoundException('Appunto non trovato');
    }

    // Check visibility permissions
    const isAuthor = note.authorId === currentUserId;
    const isElevated =
      currentUserRole === Role.TEACHER ||
      currentUserRole === Role.SCHOOL_ADMIN ||
      currentUserRole === Role.SUPER_ADMIN;

    // Spec 10.3: Private notes are NEVER visible to other users, even teachers!
    if (note.visibility === NoteVisibility.PRIVATE && !isAuthor) {
      throw new ForbiddenException('Questo appunto è privato e visibile solo all\'autore');
    }

    // Hidden notes are only visible to author and elevated moderators
    if (note.status === NoteStatus.HIDDEN && !isAuthor && !isElevated) {
      throw new ForbiddenException('Questo appunto è temporaneamente nascosto per revisione');
    }

    // Scope check for students
    if (!isAuthor && !isElevated) {
      if (note.visibility === NoteVisibility.CLASS && note.classId && note.classId !== userClassId) {
        throw new ForbiddenException('Questo appunto è riservato agli studenti della classe');
      }
      if (note.visibility === NoteVisibility.GRADE_LEVEL && note.grade && note.grade !== userGrade) {
        throw new ForbiddenException('Questo appunto è riservato agli studenti dello stesso anno di corso');
      }
    }

    // Atomically increment view count
    await this.prisma.sharedNote.update({
      where: { id: noteId },
      data: { viewCount: { increment: 1 } },
    });

    return {
      ...note,
      avgRating: Number(note.avgRating),
      tags: note.tags.map((t) => t.tag.name),
      currentUserRating: note.ratings[0]?.stars || null,
      isBookmarked: note.bookmarks.length > 0,
    };
  }

  /**
   * Update note metadata, body, or visibility
   */
  async updateNote(
    schoolId: string,
    noteId: string,
    userId: string,
    dto: UpdateSharedNoteDto,
  ) {
    const note = await this.prisma.sharedNote.findFirst({
      where: { id: noteId, schoolId, authorId: userId },
    });
    if (!note) {
      throw new NotFoundException('Appunto non trovato o non modificabile');
    }

    const updated = await this.prisma.sharedNote.update({
      where: { id: noteId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.subjectId !== undefined && { subjectId: dto.subjectId }),
        ...(dto.classId !== undefined && { classId: dto.classId }),
        ...(dto.grade !== undefined && { grade: dto.grade }),
        ...(dto.markdownBody !== undefined && { markdownBody: dto.markdownBody }),
        ...(dto.fileIds !== undefined && { fileIds: dto.fileIds }),
        ...(dto.visibility !== undefined && { visibility: dto.visibility }),
      },
    });

    if (dto.tags) {
      await this.syncTags(noteId, dto.tags);
    }

    return updated;
  }

  /**
   * Publish draft note
   */
  async publishNote(schoolId: string, noteId: string, userId: string) {
    const note = await this.prisma.sharedNote.findFirst({
      where: { id: noteId, schoolId, authorId: userId },
    });
    if (!note) {
      throw new NotFoundException('Appunto non trovato');
    }

    return this.prisma.sharedNote.update({
      where: { id: noteId },
      data: { status: NoteStatus.PUBLISHED },
    });
  }

  /**
   * Delete or remove note
   */
  async deleteNote(schoolId: string, noteId: string, userId: string, isModerator = false) {
    const note = await this.prisma.sharedNote.findFirst({
      where: {
        id: noteId,
        schoolId,
        ...(!isModerator && { authorId: userId }),
      },
    });
    if (!note) {
      throw new NotFoundException('Appunto non trovato o permessi non validi');
    }

    await this.prisma.sharedNote.update({
      where: { id: noteId },
      data: { status: NoteStatus.REMOVED },
    });

    return { message: 'Appunto eliminato con successo' };
  }

  /**
   * Record download event and increment download counter
   */
  async recordDownload(schoolId: string, noteId: string) {
    const note = await this.prisma.sharedNote.findFirst({
      where: { id: noteId, schoolId },
    });
    if (!note) {
      throw new NotFoundException('Appunto non trovato');
    }

    await this.prisma.sharedNote.update({
      where: { id: noteId },
      data: { downloadCount: { increment: 1 } },
    });

    // Fetch file records if any
    const files = await this.prisma.file.findMany({
      where: { id: { in: note.fileIds } },
      select: { id: true, originalName: true, mimeType: true, sizeBytes: true },
    });

    return {
      noteId: note.id,
      downloadCount: note.downloadCount + 1,
      files: files.map((f) => ({ ...f, sizeBytes: Number(f.sizeBytes) })),
    };
  }

  /**
   * Rate note (1-5 stars) and calculate Bayesian weighted rating
   */
  async rateNote(noteId: string, userId: string, stars: number) {
    if (stars < 1 || stars > 5) {
      throw new BadRequestException('Il voto deve essere compreso tra 1 e 5');
    }

    // Upsert rating
    await this.prisma.noteRating.upsert({
      where: { noteId_userId: { noteId, userId } },
      create: { noteId, userId, stars },
      update: { stars },
    });

    // Recalculate Bayesian average
    await this.recalculateBayesianRating(noteId);

    const updated = await this.prisma.sharedNote.findUnique({
      where: { id: noteId },
      select: { avgRating: true, ratingCount: true },
    });

    return {
      avgRating: Number(updated?.avgRating || 0),
      ratingCount: updated?.ratingCount || 0,
    };
  }

  /**
   * Delete user rating
   */
  async deleteRating(noteId: string, userId: string) {
    await this.prisma.noteRating.deleteMany({
      where: { noteId, userId },
    });

    await this.recalculateBayesianRating(noteId);
    return { message: 'Valutazione rimossa con successo' };
  }

  /**
   * Bookmark or unbookmark note
   */
  async bookmarkNote(noteId: string, userId: string) {
    await this.prisma.noteBookmark.upsert({
      where: { noteId_userId: { noteId, userId } },
      create: { noteId, userId },
      update: {},
    });
    return { message: 'Appunto aggiunto ai salvati' };
  }

  async unbookmarkNote(noteId: string, userId: string) {
    await this.prisma.noteBookmark.deleteMany({
      where: { noteId, userId },
    });
    return { message: 'Appunto rimosso dai salvati' };
  }

  /**
   * Comments and nested discussions
   */
  async listComments(noteId: string) {
    return this.prisma.noteComment.findMany({
      where: { noteId, parentId: null, deletedAt: null },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
        replies: {
          where: { deletedAt: null },
          include: {
            author: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createComment(schoolId: string, noteId: string, authorId: string, dto: CreateCommentDto) {
    const note = await this.prisma.sharedNote.findFirst({
      where: { id: noteId, schoolId },
    });
    if (!note) {
      throw new NotFoundException('Appunto non trovato');
    }

    return this.prisma.noteComment.create({
      data: {
        noteId,
        authorId,
        body: dto.body,
        parentId: dto.parentId || null,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });
  }

  async updateComment(commentId: string, authorId: string, body: string) {
    const comment = await this.prisma.noteComment.findFirst({
      where: { id: commentId, authorId, deletedAt: null },
    });
    if (!comment) {
      throw new NotFoundException('Commento non trovato');
    }

    // 10 minute edit window (spec 10.2)
    const ageMinutes = (Date.now() - comment.createdAt.getTime()) / (1000 * 60);
    if (ageMinutes > 10) {
      throw new ForbiddenException('I commenti possono essere modificati solo entro 10 minuti dalla pubblicazione');
    }

    return this.prisma.noteComment.update({
      where: { id: commentId },
      data: { body, editedAt: new Date() },
    });
  }

  async deleteComment(commentId: string, authorId: string, isElevated = false) {
    const comment = await this.prisma.noteComment.findFirst({
      where: {
        id: commentId,
        ...(!isElevated && { authorId }),
      },
    });
    if (!comment) {
      throw new NotFoundException('Commento non trovato o permessi non validi');
    }

    await this.prisma.noteComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date(), body: '[Commento rimosso]' },
    });

    return { message: 'Commento eliminato con successo' };
  }

  /**
   * Report note with automatic threshold hiding (3 distinct reports -> HIDDEN)
   */
  async reportNote(schoolId: string, noteId: string, reporterId: string, dto: ReportNoteDto) {
    const note = await this.prisma.sharedNote.findFirst({
      where: { id: noteId, schoolId },
    });
    if (!note) {
      throw new NotFoundException('Appunto non trovato');
    }

    const report = await this.prisma.noteReport.create({
      data: {
        noteId,
        reporterId,
        reason: dto.reason,
        details: dto.details || null,
      },
    });

    // Auto-takedown threshold check (spec 10.5):
    // If note has 3 or more distinct pending reports, automatically hide it!
    const distinctReportsCount = await this.prisma.noteReport.groupBy({
      by: ['reporterId'],
      where: { noteId, status: NoteReportStatus.PENDING },
    });

    if (distinctReportsCount.length >= 3) {
      await this.prisma.sharedNote.update({
        where: { id: noteId },
        data: { status: NoteStatus.HIDDEN },
      });
    }

    return {
      reportId: report.id,
      distinctReportsCount: distinctReportsCount.length,
      autoHidden: distinctReportsCount.length >= 3,
    };
  }

  /**
   * Teacher verification badge toggle (spec 10.3)
   */
  async toggleVerification(schoolId: string, noteId: string, teacherUserId: string) {
    const note = await this.prisma.sharedNote.findFirst({
      where: { id: noteId, schoolId },
    });
    if (!note) {
      throw new NotFoundException('Appunto non trovato');
    }

    const isCurrentlyVerified = !!note.verifiedAt;

    const updated = await this.prisma.sharedNote.update({
      where: { id: noteId },
      data: {
        verifiedByTeacherId: isCurrentlyVerified ? null : teacherUserId,
        verifiedAt: isCurrentlyVerified ? null : new Date(),
      },
    });

    return {
      noteId: updated.id,
      verified: !isCurrentlyVerified,
      verifiedAt: updated.verifiedAt,
    };
  }

  /**
   * Moderator Hide / Restore note
   */
  async setNoteStatus(schoolId: string, noteId: string, status: NoteStatus) {
    const note = await this.prisma.sharedNote.findFirst({
      where: { id: noteId, schoolId },
    });
    if (!note) {
      throw new NotFoundException('Appunto non trovato');
    }

    return this.prisma.sharedNote.update({
      where: { id: noteId },
      data: { status },
    });
  }

  /**
   * Get current user's notes and bookmarks
   */
  async getMyNotes(schoolId: string, userId: string) {
    return this.prisma.sharedNote.findMany({
      where: { schoolId, authorId: userId, status: { not: NoteStatus.REMOVED } },
      include: {
        subject: { select: { id: true, name: true, color: true } },
        class: { select: { id: true, name: true } },
        _count: { select: { comments: true, ratings: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getMyBookmarks(schoolId: string, userId: string) {
    const bookmarks = await this.prisma.noteBookmark.findMany({
      where: { userId, note: { schoolId, status: NoteStatus.PUBLISHED } },
      include: {
        note: {
          include: {
            author: { select: { firstName: true, lastName: true } },
            subject: { select: { id: true, name: true, color: true } },
            _count: { select: { comments: true, ratings: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return bookmarks.map((b) => b.note);
  }

  /**
   * Autocomplete tags
   */
  async autocompleteTags(q?: string) {
    return this.prisma.noteTag.findMany({
      where: q ? { name: { contains: q, mode: 'insensitive' } } : {},
      take: 20,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Helper: Bayesian Average Rating calculation
   */
  private async recalculateBayesianRating(noteId: string) {
    const ratings = await this.prisma.noteRating.findMany({
      where: { noteId },
      select: { stars: true },
    });

    const n = ratings.length;
    if (n === 0) {
      await this.prisma.sharedNote.update({
        where: { id: noteId },
        data: { avgRating: new Prisma.Decimal(0), ratingCount: 0 },
      });
      return;
    }

    const sum = ratings.reduce((acc, r) => acc + r.stars, 0);
    const bayesianAvg = (BAYESIAN_C * BAYESIAN_PRIOR_MEAN + sum) / (BAYESIAN_C + n);

    await this.prisma.sharedNote.update({
      where: { id: noteId },
      data: {
        avgRating: new Prisma.Decimal(bayesianAvg.toFixed(2)),
        ratingCount: n,
      },
    });
  }

  /**
   * Helper: sync tags for note
   */
  private async syncTags(noteId: string, tagNames: string[]) {
    await this.prisma.sharedNoteTag.deleteMany({ where: { sharedNoteId: noteId } });

    for (const rawName of tagNames) {
      const name = rawName.trim().toLowerCase();
      if (!name) continue;

      const tag = await this.prisma.noteTag.upsert({
        where: { name },
        create: { name },
        update: {},
      });

      await this.prisma.sharedNoteTag.create({
        data: {
          sharedNoteId: noteId,
          tagId: tag.id,
        },
      });
    }
  }
}
