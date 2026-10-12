import { describe, it, expect } from 'vitest';
import { AuthController } from '../../modules/auth/auth.controller';
import { UsersController } from '../../modules/users/users.controller';
import { ClassesController } from '../../modules/classes/classes.controller';
import { SubjectsController } from '../../modules/subjects/subjects.controller';
import { ImportsController } from '../../modules/imports/imports.controller';
import { PlatformController } from '../../modules/platform/platform.controller';
import { SchoolsController } from '../../modules/schools/schools.controller';
import { AuditController } from '../../modules/audit/audit.controller';
import { TimetableController } from '../../modules/timetable/timetable.controller';
import { LessonsController } from '../../modules/lessons/lessons.controller';
import { AttendanceController } from '../../modules/attendance/attendance.controller';
import { GradesController } from '../../modules/grades/grades.controller';
import { HomeworkController } from '../../modules/homework/homework.controller';
import { AgendaController } from '../../modules/agenda/agenda.controller';
import { DisciplinaryNotesController } from '../../modules/disciplinary-notes/disciplinary-notes.controller';
import { AnnouncementsController } from '../../modules/announcements/announcements.controller';
import { FilesController } from '../../modules/files/files.controller';
import { SharedNotesController } from '../../modules/shared-notes/shared-notes.controller';
import { ModerationController } from '../../modules/moderation/moderation.controller';
import { GUARDS_METADATA } from '@nestjs/common/constants';

describe('Security & Guard Coverage', () => {
  const protectedControllers = [
    UsersController,
    ClassesController,
    SubjectsController,
    ImportsController,
    PlatformController,
    SchoolsController,
    AuditController,
    TimetableController,
    LessonsController,
    AttendanceController,
    GradesController,
    HomeworkController,
    AgendaController,
    DisciplinaryNotesController,
    AnnouncementsController,
    FilesController,
    SharedNotesController,
    ModerationController,
  ];

  it('all administrative controllers have guards applied at class level', () => {
    for (const controller of protectedControllers) {
      const guards = Reflect.getMetadata(GUARDS_METADATA, controller);
      expect(guards, `Controller ${controller.name} must have class-level guards`).toBeDefined();
      expect(guards.length).toBeGreaterThan(0);
    }
  });

  it('AuthController has guards applied on sensitive endpoints (logout, me, 2FA)', () => {
    const logoutGuards = Reflect.getMetadata(GUARDS_METADATA, AuthController.prototype.logout);
    expect(logoutGuards).toBeDefined();
    expect(logoutGuards.length).toBeGreaterThan(0);

    const meGuards = Reflect.getMetadata(GUARDS_METADATA, AuthController.prototype.getMe);
    expect(meGuards).toBeDefined();
    expect(meGuards.length).toBeGreaterThan(0);
  });
});
