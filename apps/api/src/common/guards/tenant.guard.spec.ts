import { describe, it, expect } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TenantGuard } from './tenant.guard';
import { Role } from '@registro/shared';

describe('TenantGuard', () => {
  const guard = new TenantGuard();

  function createMockContext(req: Record<string, unknown>): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
      getClass: () => ({}),
      getHandler: () => ({}),
    } as unknown as ExecutionContext;
  }

  it('allows SUPER_ADMIN even without schoolId', () => {
    const req = { user: { role: Role.SUPER_ADMIN } };
    const context = createMockContext(req);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows user with valid schoolId and sets request.schoolId', () => {
    const req: Record<string, unknown> = {
      user: { role: Role.TEACHER, schoolId: 'school-uuid-1' },
      headers: {},
    };
    const context = createMockContext(req);
    expect(guard.canActivate(context)).toBe(true);
    expect(req.schoolId).toBe('school-uuid-1');
  });

  it('allows resolving schoolId from x-school-id header if not on user', () => {
    const req: Record<string, unknown> = {
      headers: { 'x-school-id': 'school-from-header' },
    };
    const context = createMockContext(req);
    expect(guard.canActivate(context)).toBe(true);
    expect(req.schoolId).toBe('school-from-header');
  });

  it('throws ForbiddenException when no schoolId is present and not SUPER_ADMIN', () => {
    const req = {
      user: { role: Role.STUDENT },
      headers: {},
    };
    const context = createMockContext(req);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
