import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Role } from '@registro/shared';
import { Request } from 'express';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    // If Super Admin, multi-tenant isolation bypass is permitted
    if (user?.role === Role.SUPER_ADMIN) {
      return true;
    }

    const schoolIdFromHeader = request.headers['x-school-id'] as string | undefined;
    const resolvedSchoolId = user?.schoolId || schoolIdFromHeader;

    if (!resolvedSchoolId) {
      throw new ForbiddenException('Tenant (scuola) non specificato o contesto non valido');
    }

    request.schoolId = resolvedSchoolId;

    return true;
  }
}
