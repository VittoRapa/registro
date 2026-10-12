import { describe, it, expect } from 'vitest';
import { loginSchema, activateAccountSchema } from './auth';

describe('Auth Zod Schemas', () => {
  describe('loginSchema', () => {
    it('should validate valid email login', () => {
      const result = loginSchema.safeParse({
        identifier: 'mario.rossi@scuola.it',
        password: 'Password123!',
      });
      expect(result.success).toBe(true);
    });

    it('should validate valid username login', () => {
      const result = loginSchema.safeParse({
        identifier: 'mario.rossi',
        password: 'Password123!',
      });
      expect(result.success).toBe(true);
    });

    it('should fail on empty identifier or password', () => {
      const result = loginSchema.safeParse({
        identifier: '',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('activateAccountSchema', () => {
    it('should validate matching password confirmation with consent', () => {
      const result = activateAccountSchema.safeParse({
        token: 'valid-activation-token-12345678',
        password: 'SecurePassword2026!',
        confirmPassword: 'SecurePassword2026!',
        acceptTerms: true,
      });
      expect(result.success).toBe(true);
    });

    it('should fail when passwords do not match', () => {
      const result = activateAccountSchema.safeParse({
        token: 'valid-activation-token-12345678',
        password: 'SecurePassword2026!',
        confirmPassword: 'DifferentPassword2026!',
        acceptTerms: true,
      });
      expect(result.success).toBe(false);
    });

    it('should fail when terms are not accepted', () => {
      const result = activateAccountSchema.safeParse({
        token: 'valid-activation-token-12345678',
        password: 'SecurePassword2026!',
        confirmPassword: 'SecurePassword2026!',
        acceptTerms: false,
      });
      expect(result.success).toBe(false);
    });
  });
});
