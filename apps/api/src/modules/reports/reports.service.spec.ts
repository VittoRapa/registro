import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportsService } from './reports.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: PrismaService;

  beforeEach(() => {
    prisma = {
      studentProfile: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      academicYear: {
        findFirst: vi.fn(),
      },
      grade: {
        findMany: vi.fn(),
      },
      attendanceRecord: {
        findMany: vi.fn(),
      },
      class: {
        findFirst: vi.fn(),
      },
      subject: {
        findMany: vi.fn(),
      },
    } as unknown as PrismaService;

    service = new ReportsService(prisma);
  });

  describe('generateReportCardPdf', () => {
    it('throws NotFoundException if student profile is missing', async () => {
      vi.spyOn(prisma.studentProfile, 'findFirst').mockResolvedValue(null);

      await expect(
        service.generateReportCardPdf('non-existent-student', 'school-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('generates a valid PDF buffer for student with grades and attendances', async () => {
      const mockStudent = {
        id: 'student-1',
        userId: 'user-1',
        user: {
          firstName: 'Mario',
          lastName: 'Rossi',
          fiscalCode: 'RSSMRA08E15F205Z',
          birthDate: new Date('2008-05-15'),
          school: {
            name: 'Liceo Scientifico Leonardo da Vinci',
            code: 'MIPS010008',
          },
        },
        enrollments: [
          {
            class: {
              name: '3A',
              grade: 3,
              section: 'A',
            },
            academicYear: {
              name: '2025/2026',
            },
          },
        ],
      };

      vi.spyOn(prisma.studentProfile, 'findFirst').mockResolvedValue(mockStudent as any);
      vi.spyOn(prisma.academicYear, 'findFirst').mockResolvedValue({ name: '2025/2026' } as any);
      vi.spyOn(prisma.grade, 'findMany').mockResolvedValue([
        {
          value: 8,
          weight: 1,
          teachingAssignment: {
            subject: { name: 'Matematica' },
            teacher: { user: { firstName: 'Luigi', lastName: 'Bianchi' } },
          },
        },
        {
          value: 7.5,
          weight: 1,
          teachingAssignment: {
            subject: { name: 'Fisica' },
            teacher: { user: { firstName: 'Anna', lastName: 'Verdi' } },
          },
        },
      ] as any);
      vi.spyOn(prisma.attendanceRecord, 'findMany').mockResolvedValue([
        { status: 'ABSENT', justificationId: 'just-1' },
        { status: 'PRESENT', justificationId: null },
      ] as any);

      const result = await service.generateReportCardPdf('student-1', 'school-1');

      expect(result).toBeDefined();
      expect(result.filename).toBe('pagella_Rossi_Mario.pdf');
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(500);
    });
  });

  describe('generateClassBoardPdf', () => {
    it('throws NotFoundException if class is not found', async () => {
      vi.spyOn(prisma.class, 'findFirst').mockResolvedValue(null);

      await expect(
        service.generateClassBoardPdf('non-existent-class', 'school-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('generates a valid landscape PDF buffer for class board', async () => {
      const mockClass = {
        id: 'class-1',
        name: '3A',
        school: { name: 'Liceo Leonardo da Vinci' },
        academicYear: { name: '2025/2026' },
        enrollments: [
          {
            studentProfile: {
              id: 'st-1',
              user: { firstName: 'Mario', lastName: 'Rossi' },
            },
          },
          {
            studentProfile: {
              id: 'st-2',
              user: { firstName: 'Giulia', lastName: 'Bianchi' },
            },
          },
        ],
      };

      vi.spyOn(prisma.class, 'findFirst').mockResolvedValue(mockClass as any);
      vi.spyOn(prisma.subject, 'findMany').mockResolvedValue([
        { id: 'sub-1', name: 'Matematica', shortName: 'MAT' },
        { id: 'sub-2', name: 'Italiano', shortName: 'ITA' },
      ] as any);
      vi.spyOn(prisma.grade, 'findMany').mockResolvedValue([
        { studentProfileId: 'st-1', teachingAssignment: { subjectId: 'sub-1' }, value: 8 },
        { studentProfileId: 'st-1', teachingAssignment: { subjectId: 'sub-2' }, value: 7 },
        { studentProfileId: 'st-2', teachingAssignment: { subjectId: 'sub-1' }, value: 5.5 },
      ] as any);

      const result = await service.generateClassBoardPdf('class-1', 'school-1');

      expect(result).toBeDefined();
      expect(result.filename).toBe('tabellone_3A.pdf');
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(500);
    });
  });
});
