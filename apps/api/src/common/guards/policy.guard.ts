import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CHECK_POLICY_KEY, PolicyHandler } from '../decorators/check-policy.decorator';
import { Request } from 'express';

@Injectable()
export class PolicyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handlers = this.reflector.getAllAndOverride<PolicyHandler[]>(CHECK_POLICY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!handlers || handlers.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    for (const handler of handlers) {
      const allowed = await handler(user, request);
      if (!allowed) {
        throw new ForbiddenException('Accesso negato dalla policy di sicurezza');
      }
    }

    return true;
  }
}
