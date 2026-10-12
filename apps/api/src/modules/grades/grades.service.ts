import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GradeType, GradeScaleType, Prisma } from '@prisma/client';

export interface CreateGradeDto {
  teachingAssignmentId: string;
  studentProfileId: string;
  termId?: string;
  value: number; // e.g. 7.5
  displayValue?: string; // e.g. "7½"
  scaleType?: GradeScaleType;
  weight?: number; // e.g. 1.0
  type: GradeType; // ORALE, SCRITTO, PRATICO
  date: string; // YYYY-MM-DD
  description?: string;
  assessmentId?: string;
}

export interface BulkCreateGradesDto {
  teachingAssignmentId: string;
  termId?: string;
  type: GradeType;
  date: string;
  title: string;
  grades: Array<{
    studentProfileId: string;
    value: number;
    displayValue?: string;
    description?: string;
  }>;
}

export interface UpdateGradeDto {
  value?: number;
  displayValue?: string;
  weight?: number;
  description?: string;
  reasonForChange?: string; // Compulsory explanation for audit
}

export interface GradeQueryFilters {
  studentProfileId?: string;
  teachingAssignmentId?: string;
  classId?: string;
  termId?: string;
}

@Injectable()
export class GradesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List grades with filters (excludes soft-deleted)
   */
  async listGrades(schoolId: string, filters: GradeQueryFilters) {
    const where: Prisma.GradeWhereInput = {
      deletedAt: null,
      studentProfile: { user: { schoolId } },
      ...(filters.studentProfileId && { studentProfileId: filters.studentProfileId }),
      ...(filters.teachingAssignmentId && {
        teachingAssignmentId: filters.teachingAssignmentId,
      }),
      ...(filters.termId && { termId: filters.termId }),
      ...(filters.classId && {
        teachingAssignment: { classId: filters.classId },
      }),
    };

    return this.prisma.grade.findMany({
      where,
      include: {
        studentProfile: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        teachingAssignment: {
          include: { subject: true, class: true },
        },
        term: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * Create single grade with audit log
   */
  async createGrade(schoolId: string, teacherUserId: string, dto: CreateGradeDto) {
    // 1. Verify student profile belongs to tenant
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: dto.studentProfileId, user: { schoolId } },
    });
    if (!student) {
      throw new NotFoundException('Studente non trovato');
    }

    // 2. Verify assignment belongs to tenant
    const assignment = await this.prisma.teachingAssignment.findFirst({
      where: { id: dto.teachingAssignmentId, class: { schoolId } },
    });
    if (!assignment) {
      throw new NotFoundException('Cattedra non trovata');
    }

    const grade = await this.prisma.grade.create({
      data: {
        teachingAssignmentId: dto.teachingAssignmentId,
        studentProfileId: dto.studentProfileId,
        termId: dto.termId,
        value: new Prisma.Decimal(dto.value),
        displayValue: dto.displayValue,
        scaleType: dto.scaleType || GradeScaleType.NUMERIC_10,
        weight: new Prisma.Decimal(dto.weight || 1.0),
        type: dto.type,
        date: new Date(dto.date),
        description: dto.description,
        assessmentId: dto.assessmentId,
        createdByTeacherId: teacherUserId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        schoolId,
        actorUserId: teacherUserId,
        actorRole: 'TEACHER',
        action: 'GRADE_CREATED',
        entityType: 'Grade',
        entityId: grade.id,
        after: {
          value: dto.value,
          studentProfileId: dto.studentProfileId,
          type: dto.type,
        },
      },
    });

    return grade;
  }

  /**
   * Bulk insert grades for an assessment (Verifica di classe)
   */
  async createBulkGrades(
    schoolId: string,
    teacherUserId: string,
    dto: BulkCreateGradesDto,
  ) {
    const assignment = await this.prisma.teachingAssignment.findFirst({
      where: { id: dto.teachingAssignmentId, class: { schoolId } },
    });
    if (!assignment) {
      throw new NotFoundException('Cattedra non trovata');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Assessment record
      const assessment = await tx.assessment.create({
        data: {
          teachingAssignmentId: dto.teachingAssignmentId,
          date: new Date(dto.date),
          title: dto.title,
          type: dto.type,
        },
      });

      // 2. Insert grades for all students
      const createdGrades = [];
      for (const entry of dto.grades) {
        const grade = await tx.grade.create({
          data: {
            teachingAssignmentId: dto.teachingAssignmentId,
            studentProfileId: entry.studentProfileId,
            termId: dto.termId,
            assessmentId: assessment.id,
            value: new Prisma.Decimal(entry.value),
            displayValue: entry.displayValue,
            type: dto.type,
            date: new Date(dto.date),
            description: entry.description,
            createdByTeacherId: teacherUserId,
          },
        });
        createdGrades.push(grade);
      }

      await tx.auditLog.create({
        data: {
          schoolId,
          actorUserId: teacherUserId,
          actorRole: 'TEACHER',
          action: 'ASSESSMENT_GRADES_CREATED',
          entityType: 'Assessment',
          entityId: assessment.id,
          after: { count: createdGrades.length, title: dto.title },
        },
      });

      return { assessment, count: createdGrades.length };
    });
  }

  /**
   * Update grade with audit logging and modification window enforcement
   */
  async updateGrade(
    schoolId: string,
    actorUserId: string,
    id: string,
    dto: UpdateGradeDto,
    isSchoolAdmin = false,
  ) {
    const grade = await this.prisma.grade.findFirst({
      where: { id, studentProfile: { user: { schoolId } }, deletedAt: null },
    });
    if (!grade) {
      throw new NotFoundException('Voto non trovato');
    }

    // Modification window check: 7 days unless admin
    const ageDays = (Date.now() - grade.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays > 7 && !isSchoolAdmin) {
      throw new ForbiddenException(
        'Finestra di modifica di 7 giorni scaduta. Richiedere approvazione al Dirigente Scolastico.',
      );
    }

    const updated = await this.prisma.grade.update({
      where: { id },
      data: {
        ...(dto.value !== undefined && { value: new Prisma.Decimal(dto.value) }),
        ...(dto.displayValue !== undefined && { displayValue: dto.displayValue }),
        ...(dto.weight !== undefined && { weight: new Prisma.Decimal(dto.weight) }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        schoolId,
        actorUserId,
        actorRole: isSchoolAdmin ? 'SCHOOL_ADMIN' : 'TEACHER',
        action: 'GRADE_UPDATED',
        entityType: 'Grade',
        entityId: id,
        before: { value: Number(grade.value), displayValue: grade.displayValue },
        after: {
          value: dto.value !== undefined ? dto.value : Number(grade.value),
          reason: dto.reasonForChange || 'Modifica voto',
        },
      },
    });

    return updated;
  }

  /**
   * Soft delete grade with audit log
   */
  async deleteGrade(
    schoolId: string,
    actorUserId: string,
    id: string,
    isSchoolAdmin = false,
  ) {
    const grade = await this.prisma.grade.findFirst({
      where: { id, studentProfile: { user: { schoolId } }, deletedAt: null },
    });
    if (!grade) {
      throw new NotFoundException('Voto non trovato');
    }

    await this.prisma.grade.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        schoolId,
        actorUserId,
        actorRole: isSchoolAdmin ? 'SCHOOL_ADMIN' : 'TEACHER',
        action: 'GRADE_DELETED',
        entityType: 'Grade',
        entityId: id,
        before: { value: Number(grade.value) },
      },
    });

    return { message: 'Voto eliminato con successo' };
  }

  /**
   * Calculate student arithmetic and weighted averages per subject & overall
   */
  async calculateStudentAverages(
    schoolId: string,
    studentProfileId: string,
    termId?: string,
  ) {
    const grades = await this.prisma.grade.findMany({
      where: {
        studentProfileId,
        deletedAt: null,
        studentProfile: { user: { schoolId } },
        ...(termId && { termId }),
      },
      include: {
        teachingAssignment: { include: { subject: true } },
      },
    });

    // Group by subject
    const bySubject: Record<
      string,
      {
        subjectName: string;
        subjectColor: string | null;
        gradesCount: number;
        sumValues: number;
        sumWeightedValues: number;
        sumWeights: number;
      }
    > = {};

    let overallSum = 0;
    let overallCount = 0;
    let overallWeightedSum = 0;
    let overallWeights = 0;

    for (const g of grades) {
      if (g.value === null) continue;
      const numVal = Number(g.value);
      const weight = Number(g.weight);
      const subId = g.teachingAssignment.subject.id;

      if (!bySubject[subId]) {
        bySubject[subId] = {
          subjectName: g.teachingAssignment.subject.name,
          subjectColor: g.teachingAssignment.subject.color,
          gradesCount: 0,
          sumValues: 0,
          sumWeightedValues: 0,
          sumWeights: 0,
        };
      }

      bySubject[subId].gradesCount++;
      bySubject[subId].sumValues += numVal;
      bySubject[subId].sumWeightedValues += numVal * weight;
      bySubject[subId].sumWeights += weight;

      overallSum += numVal;
      overallCount++;
      overallWeightedSum += numVal * weight;
      overallWeights += weight;
    }

    const subjectsSummary = Object.entries(bySubject).map(([subjectId, data]) => {
      const arithmeticAverage =
        data.gradesCount > 0 ? Number((data.sumValues / data.gradesCount).toFixed(2)) : 0;
      const weightedAverage =
        data.sumWeights > 0
          ? Number((data.sumWeightedValues / data.sumWeights).toFixed(2))
          : 0;

      return {
        subjectId,
        subjectName: data.subjectName,
        subjectColor: data.subjectColor,
        gradesCount: data.gradesCount,
        arithmeticAverage,
        weightedAverage,
      };
    });

    return {
      overallArithmeticAverage:
        overallCount > 0 ? Number((overallSum / overallCount).toFixed(2)) : 0,
      overallWeightedAverage:
        overallWeights > 0 ? Number((overallWeightedSum / overallWeights).toFixed(2)) : 0,
      totalGrades: overallCount,
      subjects: subjectsSummary,
    };
  }

  /**
   * List assessments
   */
  async listAssessments(schoolId: string, classId?: string) {
    return this.prisma.assessment.findMany({
      where: {
        teachingAssignment: {
          class: {
            schoolId,
            ...(classId && { id: classId }),
          },
        },
      },
      include: {
        teachingAssignment: {
          include: { subject: true, class: true },
        },
        _count: { select: { grades: true } },
      },
      orderBy: { date: 'desc' },
    });
  }
}
