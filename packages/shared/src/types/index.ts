export * from './api';

export interface UserJwtPayload {
  sub: string;        // User UUID
  sid: string;        // Session / RefreshToken UUID
  username: string;
  email?: string;
  role: string;
  schoolId?: string;
  iat?: number;
  exp?: number;
}
