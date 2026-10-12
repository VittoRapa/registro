import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NoteReportStatus, NoteStatus } from '@prisma/client';

export interface ResolveReportDto {
  status: NoteReportStatus;
  actionNote?: string;
}

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List reports for school with optional status filter
   */
  async listReports(schoolId: string, status?: NoteReportStatus) {
    return this.prisma.noteReport.findMany({
      where: {
        note: { schoolId },
        ...(status && { status }),
      },
      include: {
        note: {
          select: {
            id: true,
            title: true,
            status: true,
            author: { select: { firstName: true, lastName: true, role: true } },
            subject: { select: { name: true } },
          },
        },
        reporter: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        resolvedBy: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Resolve moderation report
   */
  async resolveReport(
    schoolId: string,
    reportId: string,
    resolvedById: string,
    dto: ResolveReportDto,
  ) {
    const report = await this.prisma.noteReport.findFirst({
      where: { id: reportId, note: { schoolId } },
      include: { note: true },
    });
    if (!report) {
      throw new NotFoundException('Segnalazione non trovata');
    }

    // Apply action on note based on resolution
    if (dto.status === NoteReportStatus.RESOLVED_HIDDEN) {
      await this.prisma.sharedNote.update({
        where: { id: report.noteId },
        data: { status: NoteStatus.HIDDEN },
      });
    } else if (dto.status === NoteReportStatus.RESOLVED_REMOVED) {
      await this.prisma.sharedNote.update({
        where: { id: report.noteId },
        data: { status: NoteStatus.REMOVED },
      });
    }

    return this.prisma.noteReport.update({
      where: { id: reportId },
      data: {
        status: dto.status,
        resolvedById,
        resolvedAt: new Date(),
      },
    });
  }
}
