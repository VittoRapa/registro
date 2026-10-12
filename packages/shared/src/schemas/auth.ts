import { z } from 'zod';
import { Role } from '../enums/roles';

export const passwordSchema = z
  .string()
  .min(8, 'La password deve contenere almeno 8 caratteri')
  .max(128, 'La password non può superare 128 caratteri')
  .regex(/[A-Z]/, 'La password deve contenere almeno una lettera maiuscola')
  .regex(/[a-z]/, 'La password deve contenere almeno una lettera minuscola')
  .regex(/[0-9]/, 'La password deve contenere almeno un numero')
  .regex(/[^A-Za-z0-9]/, 'La password deve contenere almeno un carattere speciale');

export const loginSchema = z
  .object({
    identifier: z.string().trim().optional(),
    username: z.string().trim().optional(),
    password: z.string().min(1, 'La password è obbligatoria'),
    totp: z.string().length(6, 'Il codice 2FA deve contenere 6 cifre').optional(),
    totpCode: z.string().length(6, 'Il codice 2FA deve contenere 6 cifre').optional(),
  })
  .transform((data): { identifier: string; password: string; totp?: string } => ({
    identifier: (data.identifier || data.username || '').trim(),
    password: data.password,
    ...(data.totp || data.totpCode ? { totp: data.totp || data.totpCode } : {}),
  }))
  .refine((data) => data.identifier.length > 0, {
    message: 'Username o email obbligatorio',
    path: ['identifier'],
  });

export type LoginDto = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().trim().email('Formato email non valido').toLowerCase().optional(),
  username: z.string().trim().min(3, 'Username deve contenere almeno 3 caratteri').max(50),
  password: passwordSchema,
  firstName: z.string().trim().min(1, 'Il nome è obbligatorio').max(100),
  lastName: z.string().trim().min(1, 'Il cognome è obbligatorio').max(100),
  fiscalCode: z
    .string()
    .trim()
    .toUpperCase()
    .length(16, 'Il codice fiscale deve essere composto da 16 caratteri')
    .optional(),
  role: z.nativeEnum(Role),
  schoolId: z.string().uuid('ID scuola non valido').optional(),
});

export type RegisterDto = z.infer<typeof registerSchema>;

export const activateAccountSchema = z
  .object({
    token: z.string().min(1, 'Token obbligatorio'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Conferma password obbligatoria'),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'Devi accettare i termini di servizio e l\'informativa privacy' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Le password non coincidono',
    path: ['confirmPassword'],
  });

export type ActivateAccountDto = z.infer<typeof activateAccountSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token obbligatorio'),
});

export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;

export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(1, 'Username o email obbligatorio'),
});

export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token obbligatorio'),
  newPassword: passwordSchema,
});

export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Password corrente obbligatoria'),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'La nuova password deve essere diversa da quella attuale',
    path: ['newPassword'],
  });

export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
