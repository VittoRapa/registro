import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';
import { PrismaService } from '../../prisma/prisma.service';

interface UserPayload {
  id: string;
  role: string;
  schoolId: string;
}

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('report-card/:studentId')
  @ApiOperation({ summary: 'Genera e scarica la Pagella Scolastica Ufficiale in formato PDF' })
  @ApiResponse({ status: 200, description: 'Stream binario PDF della pagella' })
  async getReportCard(
    @Param('studentId') studentId: string,
    @CurrentUser() user: UserPayload,
    @Res() res: Response,
  ) {
    const student = await this.prisma.studentProfile.findFirst({
      where: {
        id: studentId,
        user: { schoolId: user.schoolId },
      },
      include: {
        enrollments: {
          include: { class: true },
          take: 1,
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Profilo studente non trovato');
    }

    if (user.role === 'STUDENT' && student.userId !== user.id) {
      throw new ForbiddenException('Non puoi scaricare la pagella di un altro studente');
    }

    if (user.role === 'PARENT') {
      const parentLink = await this.prisma.parentLink.findFirst({
        where: { parentUserId: user.id, studentProfileId: student.id },
      });
      if (!parentLink) {
        throw new ForbiddenException('Non sei autorizzato a consultare la pagella di questo studente');
      }
    }

    if (user.role === 'TEACHER') {
      const teacherProfile = await this.prisma.teacherProfile.findFirst({
        where: { userId: user.id },
      });
      const classId = student.enrollments[0]?.classId;
      if (!teacherProfile || !classId) {
        throw new ForbiddenException('Docente non autorizzato');
      }
      const assignment = await this.prisma.teachingAssignment.findFirst({
        where: {
          teacherProfileId: teacherProfile.id,
          classId,
        },
      });
      if (!assignment) {
        throw new ForbiddenException('Non insegni nella classe di questo studente');
      }
    }

    const { buffer, filename } = await this.reportsService.generateReportCardPdf(studentId, user.schoolId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
    });

    res.send(buffer);
  }

  @Get('class-board/:classId')
  @ApiOperation({ summary: 'Genera e scarica il Tabellone dei Voti di Classe in formato PDF' })
  @ApiResponse({ status: 200, description: 'Stream binario PDF del tabellone di classe' })
  async getClassBoard(
    @Param('classId') classId: string,
    @CurrentUser() user: UserPayload,
    @Res() res: Response,
  ) {
    if (user.role === 'STUDENT' || user.role === 'PARENT') {
      throw new ForbiddenException('Accesso riservato a docenti e dirigenza scolastica');
    }

    if (user.role === 'TEACHER') {
      const teacherProfile = await this.prisma.teacherProfile.findFirst({
        where: { userId: user.id },
      });
      if (!teacherProfile) {
        throw new ForbiddenException('Docente non trovato');
      }
      const assignment = await this.prisma.teachingAssignment.findFirst({
        where: { teacherProfileId: teacherProfile.id, classId },
      });
      if (!assignment) {
        throw new ForbiddenException('Non hai cattedre assegnate in questa classe');
      }
    }

    const { buffer, filename } = await this.reportsService.generateClassBoardPdf(classId, user.schoolId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
    });

    res.send(buffer);
  }
}
