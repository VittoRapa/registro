import { describe, it, expect } from 'vitest';
import { validateEnv } from './env.validation';

describe('Environment Validation', () => {
  const validConfig = {
    NODE_ENV: 'development',
    PORT: '4000',
    API_URL: 'http://localhost:4000',
    WEB_URL: 'http://localhost:3000',
    DATABASE_URL: 'postgresql://registro:registro@localhost:5432/registro',
    REDIS_URL: 'redis://localhost:6379',
    JWT_ACCESS_SECRET: 'super-secret-access-token-key-min-32-chars-long!',
    JWT_REFRESH_SECRET: 'super-secret-refresh-token-key-min-32-chars-long!',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '30d',
    S3_ENDPOINT: 'http://localhost:9000',
    S3_ACCESS_KEY: 'minioadmin',
    S3_SECRET_KEY: 'minioadmin',
    S3_BUCKET: 'registro-files',
    S3_REGION: 'us-east-1',
    SMTP_HOST: 'localhost',
    SMTP_PORT: '1025',
    CLAMAV_HOST: 'localhost',
    CLAMAV_PORT: '3310',
    GOTENBERG_URL: 'http://localhost:3001',
    ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  };

  it('should parse valid environment successfully', () => {
    const config = validateEnv(validConfig);
    expect(config.NODE_ENV).toBe('development');
    expect(config.PORT).toBe(4000);
    expect(config.DATABASE_URL).toBe(validConfig.DATABASE_URL);
  });

  it('should throw an error when required DATABASE_URL is missing', () => {
    const invalidConfig = { ...validConfig, DATABASE_URL: '' };
    expect(() => validateEnv(invalidConfig)).toThrow('Config validation error');
  });

  it('should throw an error when JWT secret is shorter than 32 characters', () => {
    const invalidConfig = { ...validConfig, JWT_ACCESS_SECRET: 'short-secret' };
    expect(() => validateEnv(invalidConfig)).toThrow('JWT_ACCESS_SECRET must be at least 32 characters');
  });

  it('should normalize or derive 64-character hex key for ENCRYPTION_KEY', () => {
    const configWithShortKey = { ...validConfig, ENCRYPTION_KEY: 'invalid-key' };
    const validated = validateEnv(configWithShortKey);
    expect(validated.ENCRYPTION_KEY).toMatch(/^[0-9a-f]{64}$/);
    expect(validated.ENCRYPTION_KEY.length).toBe(64);
  });
});
