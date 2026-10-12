export * from './api';

export interface UserJwtPayload {
  sub: string;
  email: string;
  role: string;
  schoolId?: string;
  iat?: number;
  exp?: number;
}
