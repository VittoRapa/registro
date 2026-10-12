import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GradesService } from './grades.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('GradesService', () => {
  let service: GradesService;
  let prismaMock: {
    grade: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    studentProfile: {
      findFirst: ReturnType<typeof vi.fn>;
    };
    teachingAssignment: {
      findFirst: ReturnType<typeof vi.fn>;
    };
    auditLog: {
      create: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    prismaMock = {
      grade: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      studentProfile: {
        findFirst: vi.fn(),
      },
      teachingAssignment: {
        findFirst: vi.fn(),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    service = new GradesService(prismaMock as unknown as PrismaService);
  });

  describe('calculateStudentAverages', () => {
    it('calculates exact arithmetic and weighted averages per subject and overall', async () => {
      // Mock grades:
      // Math: 6 (weight 1.0), 8 (weight 2.0) -> Weighted = (6 + 16)/3 = 7.33, Arithmetic = 14/2 = 7.00
      // Physics: 7 (weight 1.0) -> Weighted = 7.00, Arithmetic = 7.00
      // Overall arithmetic: (6 + 8 + 7)/3 = 7.00
      // Overall weighted: (6*1 + 8*2 + 7*1) / (1 + 2 + 1) = 29 / 4 = 7.25
      prismaMock.grade.findMany.mockResolvedValueOnce([
        {
          value: new Prisma.Decimal(6.0),
          weight: new Prisma.Decimal(1.0),
          teachingAssignment: {
            subject: { id: 'math-id', name: 'Matematica', color: '#3B82F6' },
          },
        },
        {
          value: new Prisma.Decimal(8.0),
          weight: new Prisma.Decimal(2.0),
          teachingAssignment: {
            subject: { id: 'math-id', name: 'Matematica', color: '#3B82F6' },
          },
        },
        {
          value: new Prisma.Decimal(7.0),
          weight: new Prisma.Decimal(1.0),
          teachingAssignment: {
            subject: { id: 'phys-id', name: 'Fisica', color: '#8B5CF6' },
          },
        },
      ]);

      const result = await service.calculateStudentAverages('school-1', 'student-1');

      expect(result.totalGrades).toBe(3);
      expect(result.overallArithmeticAverage).toBe(7.0);
      expect(result.overallWeightedAverage).toBe(7.25);

      const math = result.subjects.find((s) => s.subjectId === 'math-id');
      expect(math).toBeDefined();
      expect(math?.arithmeticAverage).toBe(7.0);
      expect(math?.weightedAverage).toBe(7.33);

      const phys = result.subjects.find((s) => s.subjectId === 'phys-id');
      expect(phys).toBeDefined();
      expect(phys?.arithmeticAverage).toBe(7.0);
      expect(phys?.weightedAverage).toBe(7.0);
    });

    it('returns 0 when student has no grades', async () => {
      prismaMock.grade.findMany.mockResolvedValueOnce([]);

      const result = await service.calculateStudentAverages('school-1', 'student-1');

      expect(result.totalGrades).toBe(0);
      expect(result.overallArithmeticAverage).toBe(0);
      expect(result.overallWeightedAverage).toBe(0);
      expect(result.subjects).toHaveLength(0);
    });
  });

  describe('updateGrade modification window', () => {
    it('blocks teacher modification after 7-day window has expired', async () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      prismaMock.grade.findFirst.mockResolvedValueOnce({
        id: 'grade-1',
        value: new Prisma.Decimal(6.0),
        displayValue: '6',
        createdAt: tenDaysAgo,
      });

      await expect(
        service.updateGrade(
          'school-1',
          'teacher-1',
          'grade-1',
          { value: 7.0 },
          false, // isSchoolAdmin = false
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows school admin modification even after 7-day window has expired', async () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      prismaMock.grade.findFirst.mockResolvedValueOnce({
        id: 'grade-1',
        value: new Prisma.Decimal(6.0),
        displayValue: '6',
        createdAt: tenDaysAgo,
      });
      prismaMock.grade.update.mockResolvedValueOnce({
        id: 'grade-1',
        value: new Prisma.Decimal(7.0),
      });

      const updated = await service.updateGrade(
        'school-1',
        'admin-1',
        'grade-1',
        { value: 7.0, reasonForChange: 'Rettifica errore materiale' },
        true, // isSchoolAdmin = true
      );

      expect(updated).toBeDefined();
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'GRADE_UPDATED',
            actorRole: 'SCHOOL_ADMIN',
          }),
        }),
      );
    });
  });
});
