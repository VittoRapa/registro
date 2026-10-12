import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private readonly encryptionKey: Buffer;
  // Pre-computed dummy hash to ensure constant-time response on failed login when user not found
  private dummyHash: string = '';

  constructor(private readonly configService: ConfigService) {
    let hexKey = this.configService.get<string>('ENCRYPTION_KEY');
    if (!hexKey || hexKey.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(hexKey)) {
      hexKey = crypto.createHash('sha256').update(hexKey || 'registro-encryption-fallback-key').digest('hex');
    }
    this.encryptionKey = Buffer.from(hexKey, 'hex');

    // Initialize dummy hash
    argon2
      .hash('dummy-password-for-timing-attack-prevention', {
        type: argon2.argon2id,
        memoryCost: 65536, // 64 MB
        timeCost: 3,
        parallelism: 1,
      })
      .then((hash) => {
        this.dummyHash = hash;
      })
      .catch(() => {
        // Fallback dummy
      });
  }

  /**
   * Hashes a password using argon2id with recommended parameters
   */
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3,
      parallelism: 1,
    });
  }

  /**
   * Verifies password against argon2 hash
   */
  async verifyPassword(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  /**
   * Performs dummy verification to prevent timing attacks when user does not exist
   */
  async verifyDummy(password: string): Promise<void> {
    if (this.dummyHash) {
      try {
        await argon2.verify(this.dummyHash, password);
      } catch {
        // Expected
      }
    }
  }

  /**
   * Encrypts plaintext using AES-256-GCM
   * Returns format: iv:authTag:ciphertext (hex encoded)
   */
  encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(12); // 96-bit IV for GCM
      const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch {
      throw new InternalServerErrorException('Errore durante la cifratura del dato');
    }
  }

  /**
   * Decrypts AES-256-GCM ciphertext
   */
  decrypt(encryptedPayload: string): string {
    try {
      const parts = encryptedPayload.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted payload format');
      }

      const [ivHex, authTagHex, encryptedText] = parts;
      if (!ivHex || !authTagHex || !encryptedText) {
        throw new Error('Malformed payload');
      }

      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      throw new InternalServerErrorException('Errore durante la decifratura del dato');
    }
  }

  /**
   * Generates a secure random token (e.g. for refresh token, activation, password reset)
   */
  generateSecureToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Hashes a token using SHA-256 (for storing refresh tokens / reset tokens securely)
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
