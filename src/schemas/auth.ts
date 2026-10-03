import { z } from 'zod';

/**
 * Schemas de validação Zod para os formulários de Login e Cadastro.
 *
 * Regras estritas:
 * - Nome: 2 a 120 caracteres após normalização (.trim())
 * - E-mail: formato válido, até 254 caracteres
 * - Senha: entre 8 e 128 caracteres, SEM remoção de espaços
 * - passwordConfirmation: apenas no cliente, deve coincidir exatamente
 */

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Informe seu e-mail.')
    .email('Informe um e-mail válido.')
    .max(254, 'O e-mail deve ter no máximo 254 caracteres.'),
  password: z
    .string()
    .min(1, 'Informe sua senha.')
    .min(8, 'A senha deve ter no mínimo 8 caracteres.')
    .max(128, 'A senha deve ter no máximo 128 caracteres.'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'O nome deve ter no mínimo 2 caracteres.')
      .max(120, 'O nome deve ter no máximo 120 caracteres.'),
    email: z
      .string()
      .trim()
      .min(1, 'Informe seu e-mail.')
      .email('Informe um e-mail válido.')
      .max(254, 'O e-mail deve ter no máximo 254 caracteres.'),
    // A senha preserva rigorosamente todos os espaços (internos e nas pontas)
    password: z
      .string()
      .min(8, 'A senha deve ter no mínimo 8 caracteres.')
      .max(128, 'A senha deve ter no máximo 128 caracteres.'),
    passwordConfirmation: z
      .string()
      .min(1, 'Confirme sua senha.'),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'A confirmação de senha deve ser idêntica à senha.',
    path: ['passwordConfirmation'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Informe seu e-mail.')
    .email('Informe um e-mail válido.')
    .max(254, 'O e-mail deve ter no máximo 254 caracteres.'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z
      .string()
      .min(1, 'Informe o código de recuperação.')
      .refine(
        (val) => {
          const cleaned = val.replace(/[\s-]/g, '').toUpperCase();
          return cleaned.length === 8 && /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(cleaned);
        },
        {
          message: 'Informe um código válido com 8 caracteres (ex: XXXX-XXXX).',
        },
      ),
    newPassword: z
      .string()
      .min(8, 'A nova senha deve ter no mínimo 8 caracteres.')
      .max(128, 'A nova senha deve ter no máximo 128 caracteres.'),
    passwordConfirmation: z
      .string()
      .min(1, 'Confirme sua nova senha.'),
  })
  .refine((data) => data.newPassword === data.passwordConfirmation, {
    message: 'A confirmação de senha deve ser idêntica à nova senha.',
    path: ['passwordConfirmation'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
