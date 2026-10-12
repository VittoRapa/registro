import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserJwtPayload } from '@registro/shared';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user?: UserJwtPayload;
}

export const CurrentUser = createParamDecorator(
  (data: keyof UserJwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
