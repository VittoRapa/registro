import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UserJwtPayload } from '@registro/shared';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token di autenticazione mancante o formato non valido');
    }

    const token = authHeader.substring(7);

    try {
      const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
      const payload = await this.jwtService.verifyAsync<UserJwtPayload>(token, {
        secret,
      });

      // Attach payload to request
      request.user = {
        id: payload.sub,
        sub: payload.sub,
        sessionId: payload.sid,
        sid: payload.sid,
        username: payload.username,
        email: payload.email,
        role: payload.role,
        schoolId: payload.schoolId,
      };

      return true;
    } catch {
      throw new UnauthorizedException('Token non valido o scaduto');
    }
  }
}
