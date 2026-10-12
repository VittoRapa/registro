import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Role, UserJwtPayload } from '@registro/shared';
import { Request } from 'express';

interface RequestWithTenant extends Request {
  user?: UserJwtPayload;
  schoolId?: string;
}

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithTenant>();
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

    // Attach schoolId to the request context
    request.schoolId = resolvedSchoolId;

    return true;
  }
}
