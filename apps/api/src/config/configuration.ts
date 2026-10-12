export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),
  apiUrl: process.env.API_URL ?? 'http://localhost:4000',
  webUrl: process.env.WEB_URL ?? 'http://localhost:3000',
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT,
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY,
    bucket: process.env.S3_BUCKET ?? 'registro-files',
    region: process.env.S3_REGION ?? 'us-east-1',
  },
  smtp: {
    host: process.env.SMTP_HOST ?? 'localhost',
    port: parseInt(process.env.SMTP_PORT ?? '1025', 10),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? 'Registro Elettronico <noreply@registro.local>',
  },
  clamav: {
    host: process.env.CLAMAV_HOST ?? 'localhost',
    port: parseInt(process.env.CLAMAV_PORT ?? '3310', 10),
  },
  gotenberg: {
    url: process.env.GOTENBERG_URL ?? 'http://localhost:3001',
  },
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY,
  },
  sentry: {
    dsn: process.env.SENTRY_DSN ?? '',
  },
});
