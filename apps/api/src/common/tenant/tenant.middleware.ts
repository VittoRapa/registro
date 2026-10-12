import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContext } from './tenant-context';

export interface AuthenticatedUser {
  id: string;
  sub: string;
  sessionId: string;
  sid: string;
  username: string;
  email?: string;
  role: string;
  schoolId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      schoolId?: string;
    }
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const user = req.user;
    const headerSchoolId = req.headers['x-school-id'] as string | undefined;

    let targetSchoolId: string | undefined = undefined;

    if (user) {
      if (user.role === 'SUPER_ADMIN') {
        targetSchoolId = headerSchoolId || user.schoolId;
      } else {
        targetSchoolId = user.schoolId;
      }
    } else if (headerSchoolId) {
      targetSchoolId = headerSchoolId;
    }

    if (targetSchoolId) {
      req.schoolId = targetSchoolId;
    }

    TenantContext.run(
      {
        schoolId: targetSchoolId,
        userId: user?.id,
        userRole: user?.role,
      },
      () => {
        next();
      },
    );
  }
}
