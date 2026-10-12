import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate RFC 5545 iCalendar ICS string for user or class
   */
  async generateIcsFeed(schoolId: string, classId?: string): Promise<string> {
    const events = await this.prisma.agendaEvent.findMany({
      where: {
        class: { schoolId },
        ...(classId ? { classId } : {}),
        startAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days onwards
      },
      include: {
        class: { select: { name: true } },
      },
      take: 100,
    });

    const formatIcsDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Registro Elettronico//Agenda Didattica//IT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Registro Elettronico Didattica',
      'X-WR-TIMEZONE:Europe/Rome',
    ];

    for (const ev of events) {
      const endDate = ev.endAt || new Date(ev.startAt.getTime() + 60 * 60 * 1000);
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${ev.id}@registro`);
      lines.push(`DTSTAMP:${formatIcsDate(new Date())}`);
      lines.push(`DTSTART:${formatIcsDate(ev.startAt)}`);
      lines.push(`DTEND:${formatIcsDate(endDate)}`);
      lines.push(`SUMMARY:${ev.title.replace(/[\r\n]/g, ' ')} [${ev.class?.name || 'Scuola'}]`);
      if (ev.description) {
        lines.push(`DESCRIPTION:${ev.description.replace(/[\r\n]/g, ' ')}`);
      }
      lines.push('STATUS:CONFIRMED');
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }
}
