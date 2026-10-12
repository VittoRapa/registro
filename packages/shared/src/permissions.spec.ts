import { describe, it, expect } from 'vitest';
import { Role } from './enums/roles';
import { Permissions, ROLE_PERMISSIONS, hasPermission } from './permissions';

describe('Permissions Matrix', () => {
  it('SUPER_ADMIN should have all permissions', () => {
    const allPermissions = Object.values(Permissions);
    for (const permission of allPermissions) {
      expect(hasPermission(Role.SUPER_ADMIN, permission)).toBe(true);
    }
  });

  it('STUDENT cannot record attendance or manage grades', () => {
    expect(hasPermission(Role.STUDENT, Permissions.RECORD_ATTENDANCE)).toBe(false);
    expect(hasPermission(Role.STUDENT, Permissions.MANAGE_GRADES)).toBe(false);
    expect(hasPermission(Role.STUDENT, Permissions.MANAGE_SCHOOL_USERS)).toBe(false);
  });

  it('STUDENT can view own grades and upload notes', () => {
    expect(hasPermission(Role.STUDENT, Permissions.VIEW_OWN_GRADES)).toBe(true);
    expect(hasPermission(Role.STUDENT, Permissions.UPLOAD_NOTES)).toBe(true);
    expect(hasPermission(Role.STUDENT, Permissions.VOTE_NOTES)).toBe(true);
  });

  it('TEACHER can manage grades, record attendance, and sign lesson hours', () => {
    expect(hasPermission(Role.TEACHER, Permissions.MANAGE_GRADES)).toBe(true);
    expect(hasPermission(Role.TEACHER, Permissions.RECORD_ATTENDANCE)).toBe(true);
    expect(hasPermission(Role.TEACHER, Permissions.SIGN_LESSON_HOUR)).toBe(true);
    expect(hasPermission(Role.TEACHER, Permissions.MODERATE_NOTES)).toBe(true);
  });

  it('TEACHER cannot manage school settings or profile', () => {
    expect(hasPermission(Role.TEACHER, Permissions.MANAGE_SCHOOL_PROFILE)).toBe(false);
    expect(hasPermission(Role.TEACHER, Permissions.MANAGE_SYSTEM_SETTINGS)).toBe(false);
  });

  it('PARENT can justify absence and view own attendance/grades', () => {
    expect(hasPermission(Role.PARENT, Permissions.JUSTIFY_ABSENCE)).toBe(true);
    expect(hasPermission(Role.PARENT, Permissions.VIEW_OWN_GRADES)).toBe(true);
    expect(hasPermission(Role.PARENT, Permissions.VIEW_OWN_ATTENDANCE)).toBe(true);
  });

  it('PARENT cannot record attendance or manage grades', () => {
    expect(hasPermission(Role.PARENT, Permissions.RECORD_ATTENDANCE)).toBe(false);
    expect(hasPermission(Role.PARENT, Permissions.MANAGE_GRADES)).toBe(false);
  });

  it('SCHOOL_ADMIN can manage school users and view school audit logs', () => {
    expect(hasPermission(Role.SCHOOL_ADMIN, Permissions.MANAGE_SCHOOL_USERS)).toBe(true);
    expect(hasPermission(Role.SCHOOL_ADMIN, Permissions.VIEW_SCHOOL_AUDIT_LOGS)).toBe(true);
    expect(hasPermission(Role.SCHOOL_ADMIN, Permissions.VIEW_GLOBAL_AUDIT_LOGS)).toBe(false);
  });
});
