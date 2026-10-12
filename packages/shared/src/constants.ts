export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const RATE_LIMITS = {
  GLOBAL_TTL_MS: 60 * 1000, // 1 minute
  GLOBAL_LIMIT: 100, // 100 requests per minute
  AUTH_LOGIN_TTL_MS: 15 * 60 * 1000, // 15 minutes
  AUTH_LOGIN_LIMIT: 5, // 5 failed attempts per 15 min
} as const;

export const FILE_UPLOAD_LIMITS = {
  MAX_FILE_SIZE_BYTES: 25 * 1024 * 1024, // 25 MB
  MAX_AVATAR_SIZE_BYTES: 5 * 1024 * 1024, // 5 MB
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
  ] as readonly string[],
} as const;

export const AUTH_COOKIE_NAMES = {
  ACCESS_TOKEN: 'registro_access_token',
  REFRESH_TOKEN: 'registro_refresh_token',
} as const;
