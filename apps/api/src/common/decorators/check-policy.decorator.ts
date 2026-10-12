import { SetMetadata } from '@nestjs/common';

export type PolicyHandler = (user: unknown, resource?: unknown) => boolean | Promise<boolean>;

export const CHECK_POLICY_KEY = 'checkPolicy';
export const CheckPolicy = (...handlers: PolicyHandler[]) => SetMetadata(CHECK_POLICY_KEY, handlers);
