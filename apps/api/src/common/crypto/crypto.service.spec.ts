import { describe, it, expect } from 'vitest';
import { CryptoService } from './crypto.service';
import { ConfigService } from '@nestjs/config';

describe('CryptoService', () => {
  const mockConfigService = {
    get: (key: string) => {
      if (key === 'ENCRYPTION_KEY') {
        return '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      }
      return null;
    },
  } as unknown as ConfigService;

  const cryptoService = new CryptoService(mockConfigService);

  describe('Password Hashing (argon2id)', () => {
    it('should hash a password and verify it correctly', async () => {
      const password = 'SuperSecretPassword2026!';
      const hash = await cryptoService.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).toContain('$argon2id$');

      const isValid = await cryptoService.verifyPassword(hash, password);
      expect(isValid).toBe(true);

      const isInvalid = await cryptoService.verifyPassword(hash, 'WrongPassword123!');
      expect(isInvalid).toBe(false);
    });
  });

  describe('AES-256-GCM Field Encryption', () => {
    it('should encrypt and decrypt sensitive data accurately', () => {
      const sensitiveText = 'RSSMRA85M01H501Z'; // Codice Fiscale
      const encrypted = cryptoService.encrypt(sensitiveText);

      expect(encrypted).not.toBe(sensitiveText);
      expect(encrypted.split(':')).toHaveLength(3); // iv:authTag:ciphertext

      const decrypted = cryptoService.decrypt(encrypted);
      expect(decrypted).toBe(sensitiveText);
    });

    it('should throw error on tampered ciphertext', () => {
      const sensitiveText = '2FA_SECRET_KEY_12345';
      const encrypted = cryptoService.encrypt(sensitiveText);
      const tampered = encrypted.slice(0, -4) + 'ffff';

      expect(() => cryptoService.decrypt(tampered)).toThrow();
    });
  });

  describe('Token Generation & Hashing', () => {
    it('should generate cryptographically secure tokens', () => {
      const token1 = cryptoService.generateSecureToken(32);
      const token2 = cryptoService.generateSecureToken(32);

      expect(token1).toHaveLength(64); // 32 bytes in hex
      expect(token1).not.toBe(token2);
    });

    it('should hash tokens deterministically with SHA-256', () => {
      const token = 'sample-refresh-token';
      const hash1 = cryptoService.hashToken(token);
      const hash2 = cryptoService.hashToken(token);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });
  });
});
