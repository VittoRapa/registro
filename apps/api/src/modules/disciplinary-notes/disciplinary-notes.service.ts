import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DisciplinaryNoteType } from '@prisma/client';

export interface CreateDisciplinaryNoteDto {
  studentProfileId?: string;
  classId?: string;
  type: DisciplinaryNoteType;
  text: string;
  date: string; // YYYY-MM-DD
  visibleToParent?: boolean;
}

@Injectable()
export class DisciplinaryNotesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List disciplinary notes
   */
  async listNotes(
    schoolId: string,
    filters: { studentProfileId?: string; classId?: string },
  ) {
    return this.prisma.disciplinaryNote.findMany({
      where: {
        teacher: { schoolId },
        ...(filters.studentProfileId && { studentProfileId: filters.studentProfileId }),
        ...(filters.classId && { classId: filters.classId }),
      },
      include: {
        studentProfile: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        class: { select: { id: true, name: true } },
        teacher: { select: { firstName: true, lastName: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * Create disciplinary note by teacher
   */
  async createNote(
    schoolId: string,
    teacherUserId: string,
    dto: CreateDisciplinaryNoteDto,
  ) {
    if (!dto.studentProfileId && !dto.classId) {
      throw new NotFoundException('Specificare almeno uno studente o una classe');
    }

    const note = await this.prisma.disciplinaryNote.create({
      data: {
        studentProfileId: dto.studentProfileId,
        classId: dto.classId,
        teacherId: teacherUserId,
        type: dto.type,
        text: dto.text,
        date: new Date(dto.date),
        visibleToParent: dto.visibleToParent !== undefined ? dto.visibleToParent : true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        schoolId,
        actorUserId: teacherUserId,
        actorRole: 'TEACHER',
        action: 'DISCIPLINARY_NOTE_CREATED',
        entityType: 'DisciplinaryNote',
        entityId: note.id,
        after: { type: dto.type, studentProfileId: dto.studentProfileId },
      },
    });

    return note;
  }

  /**
   * Parent confirms acknowledgment of disciplinary note
   */
  async acknowledgeNote(schoolId: string, parentUserId: string, noteId: string) {
    const note = await this.prisma.disciplinaryNote.findFirst({
      where: { id: noteId, teacher: { schoolId } },
      include: {
        studentProfile: {
          include: { parentLinks: true },
        },
      },
    });

    if (!note) {
      throw new NotFoundException('Nota disciplinare non trovata');
    }

    // Verify parent is linked to student
    if (note.studentProfile) {
      const isParent = note.studentProfile.parentLinks.some(
        (pl) => pl.parentUserId === parentUserId,
      );
      if (!isParent) {
        throw new ForbiddenException('Non sei collegato a questo studente');
      }
    }

    return this.prisma.disciplinaryNote.update({
      where: { id: noteId },
      data: {
        acknowledgedByParentAt: new Date(),
      },
    });
  }
}
