import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { CryptoModule } from './common/crypto/crypto.module';
import { AuthModule } from './modules/auth/auth.module';
import { PlatformModule } from './modules/platform/platform.module';
import { SchoolsModule } from './modules/schools/schools.module';
import { UsersModule } from './modules/users/users.module';
import { AcademicYearsModule } from './modules/academic-years/academic-years.module';
import { ClassesModule } from './modules/classes/classes.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { TeachingAssignmentsModule } from './modules/teaching-assignments/teaching-assignments.module';
import { ImportsModule } from './modules/imports/imports.module';
import { AuditModule } from './modules/audit/audit.module';
import { TimetableModule } from './modules/timetable/timetable.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { GradesModule } from './modules/grades/grades.module';
import { HomeworkModule } from './modules/homework/homework.module';
import { AgendaModule } from './modules/agenda/agenda.module';
import { DisciplinaryNotesModule } from './modules/disciplinary-notes/disciplinary-notes.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { FilesModule } from './modules/files/files.module';
import { SharedNotesModule } from './modules/shared-notes/shared-notes.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { MeetingsModule } from './modules/meetings/meetings.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { EventsModule } from './modules/events/events.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { FlashcardsModule } from './modules/flashcards/flashcards.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TenantMiddleware } from './common/tenant/tenant.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  singleLine: true,
                  colorize: true,
                },
              }
            : undefined,
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      },
    }),
    PrismaModule,
    CryptoModule,
    AuthModule,
    PlatformModule,
    SchoolsModule,
    UsersModule,
    AcademicYearsModule,
    ClassesModule,
    SubjectsModule,
    TeachingAssignmentsModule,
    ImportsModule,
    AuditModule,
    TimetableModule,
    LessonsModule,
    AttendanceModule,
    GradesModule,
    HomeworkModule,
    AgendaModule,
    DisciplinaryNotesModule,
    AnnouncementsModule,
    FilesModule,
    SharedNotesModule,
    ModerationModule,
    MessagingModule,
    MeetingsModule,
    NotificationsModule,
    EventsModule,
    CalendarModule,
    FlashcardsModule,
    ReportsModule,
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
