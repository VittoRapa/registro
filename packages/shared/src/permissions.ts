import { Role } from './enums/roles';

export const Permissions = {
  // System / SuperAdmin
  MANAGE_ALL_SCHOOLS: 'manage:all_schools',
  VIEW_GLOBAL_AUDIT_LOGS: 'view:global_audit_logs',
  MANAGE_SYSTEM_SETTINGS: 'manage:system_settings',

  // School Administration
  MANAGE_SCHOOL_PROFILE: 'manage:school_profile',
  MANAGE_SCHOOL_USERS: 'manage:school_users',
  MANAGE_ACADEMIC_YEARS: 'manage:academic_years',
  MANAGE_CLASSES: 'manage:classes',
  MANAGE_SUBJECTS: 'manage:subjects',
  ASSIGN_TEACHERS: 'manage:teacher_assignments',
  ENROLL_STUDENTS: 'manage:student_enrollments',
  VIEW_SCHOOL_AUDIT_LOGS: 'view:school_audit_logs',

  // Electronic Register (Grades, Attendance, Lessons, Homework)
  VIEW_CLASS_REGISTER: 'view:class_register',
  SIGN_LESSON_HOUR: 'manage:lesson_hours',
  RECORD_ATTENDANCE: 'manage:attendance',
  MANAGE_GRADES: 'manage:grades',
  MANAGE_HOMEWORK: 'manage:homework',
  VIEW_OWN_GRADES: 'view:own_grades',
  VIEW_OWN_ATTENDANCE: 'view:own_attendance',
  JUSTIFY_ABSENCE: 'manage:justify_absence',

  // Shared Notes / Appunti Condivisi
  UPLOAD_NOTES: 'upload:notes',
  VIEW_NOTES: 'view:notes',
  MODERATE_NOTES: 'moderate:notes',
  VOTE_NOTES: 'vote:notes',

  // Communications / Circulars
  CREATE_CIRCULAR: 'create:circulars',
  READ_CIRCULARS: 'read:circulars',
  SIGN_CIRCULAR: 'sign:circulars',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permissions),

  [Role.SCHOOL_ADMIN]: [
    Permissions.MANAGE_SCHOOL_PROFILE,
    Permissions.MANAGE_SCHOOL_USERS,
    Permissions.MANAGE_ACADEMIC_YEARS,
    Permissions.MANAGE_CLASSES,
    Permissions.MANAGE_SUBJECTS,
    Permissions.ASSIGN_TEACHERS,
    Permissions.ENROLL_STUDENTS,
    Permissions.VIEW_SCHOOL_AUDIT_LOGS,
    Permissions.VIEW_CLASS_REGISTER,
    Permissions.RECORD_ATTENDANCE,
    Permissions.MANAGE_GRADES,
    Permissions.MANAGE_HOMEWORK,
    Permissions.MODERATE_NOTES,
    Permissions.CREATE_CIRCULAR,
    Permissions.READ_CIRCULARS,
    Permissions.VIEW_NOTES,
  ],

  [Role.TEACHER]: [
    Permissions.VIEW_CLASS_REGISTER,
    Permissions.SIGN_LESSON_HOUR,
    Permissions.RECORD_ATTENDANCE,
    Permissions.MANAGE_GRADES,
    Permissions.MANAGE_HOMEWORK,
    Permissions.UPLOAD_NOTES,
    Permissions.VIEW_NOTES,
    Permissions.MODERATE_NOTES,
    Permissions.READ_CIRCULARS,
    Permissions.SIGN_CIRCULAR,
  ],

  [Role.STUDENT]: [
    Permissions.VIEW_OWN_GRADES,
    Permissions.VIEW_OWN_ATTENDANCE,
    Permissions.UPLOAD_NOTES,
    Permissions.VIEW_NOTES,
    Permissions.VOTE_NOTES,
    Permissions.READ_CIRCULARS,
    Permissions.SIGN_CIRCULAR,
  ],

  [Role.PARENT]: [
    Permissions.VIEW_OWN_GRADES,
    Permissions.VIEW_OWN_ATTENDANCE,
    Permissions.JUSTIFY_ABSENCE,
    Permissions.VIEW_NOTES,
    Permissions.READ_CIRCULARS,
    Permissions.SIGN_CIRCULAR,
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.includes(permission);
}
