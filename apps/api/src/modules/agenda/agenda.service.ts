import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AgendaEventType } from '@prisma/client';

export interface CreateAgendaEventDto {
  classId?: string;
  type: AgendaEventType;
  title: string;
  description?: string;
  startAt: string; // ISO 8601
  endAt?: string; // ISO 8601
  allDay?: boolean;
}

@Injectable()
export class AgendaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List agenda events for class or overall
   */
  async listEvents(
    schoolId: string,
    filters: { classId?: string; from?: string; to?: string },
  ) {
    return this.prisma.agendaEvent.findMany({
      where: {
        OR: [
          { classId: null },
          { class: { schoolId, ...(filters.classId && { id: filters.classId }) } },
        ],
        ...(filters.from && { startAt: { gte: new Date(filters.from) } }),
        ...(filters.to && { startAt: { lte: new Date(filters.to) } }),
      },
      include: {
        class: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { startAt: 'asc' },
    });
  }

  /**
   * Create new agenda event
   */
  async createEvent(
    schoolId: string,
    actorUserId: string,
    dto: CreateAgendaEventDto,
  ) {
    if (dto.classId) {
      const classRecord = await this.prisma.class.findFirst({
        where: { id: dto.classId, schoolId },
      });
      if (!classRecord) {
        throw new NotFoundException('Classe non trovata');
      }
    }

    return this.prisma.agendaEvent.create({
      data: {
        classId: dto.classId,
        createdByUserId: actorUserId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        startAt: new Date(dto.startAt),
        endAt: dto.endAt ? new Date(dto.endAt) : null,
        allDay: dto.allDay || false,
      },
    });
  }

  /**
   * Delete an agenda event
   */
  async deleteEvent(schoolId: string, id: string) {
    const event = await this.prisma.agendaEvent.findFirst({
      where: {
        id,
        OR: [{ classId: null }, { class: { schoolId } }],
      },
    });
    if (!event) {
      throw new NotFoundException('Evento non trovato');
    }

    await this.prisma.agendaEvent.delete({ where: { id } });
    return { message: 'Evento eliminato con successo' };
  }
}
