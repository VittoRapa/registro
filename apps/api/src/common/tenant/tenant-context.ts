import { AsyncLocalStorage } from 'async_hooks';

export interface TenantStore {
  schoolId?: string;
  userId?: string;
  userRole?: string;
}

export const tenantStorage = new AsyncLocalStorage<TenantStore>();

export class TenantContext {
  static getStore(): TenantStore | undefined {
    return tenantStorage.getStore();
  }

  static getSchoolId(): string | undefined {
    return tenantStorage.getStore()?.schoolId;
  }

  static getUserId(): string | undefined {
    return tenantStorage.getStore()?.userId;
  }

  static getUserRole(): string | undefined {
    return tenantStorage.getStore()?.userRole;
  }

  static run<R>(store: TenantStore, callback: () => R): R {
    return tenantStorage.run(store, callback);
  }
}
