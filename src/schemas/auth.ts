import { z } from 'zod';
import { isValidBrazilianPhone } from '../utils/phone.ts';

/**
 * Schemas de validação Zod para os formulários de Login e Cadastro.
 *
 * Regras estritas:
 * - Nome: 2 a 120 caracteres após normalização (.trim())
 * - E-mail: formato válido, até 254 caracteres
 * - Senha: entre 8 e 128 caracteres, SEM remoção de espaços
 * - passwordConfirmation: apenas no cliente, deve coincidir exatamente
 * - termsAccepted: booleano obrigatório true
 * - privacyAware: booleano obrigatório true
 * - phone: opcional; se preenchido, deve ser telefone brasileiro válido com DDD
 * - phoneContactAuthorized: booleano opcional (default false)
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
    phone: z.string().optional(),
    phoneContactAuthorized: z.boolean().optional(),
    termsAccepted: z
      .boolean()
      .refine((val) => val === true, {
        message: 'É necessário aceitar os Termos de Uso.',
      }),
    privacyAware: z
      .boolean()
      .refine((val) => val === true, {
        message: 'É necessário declarar ciência do Aviso de Privacidade.',
      }),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'A confirmação de senha deve ser idêntica à senha.',
    path: ['passwordConfirmation'],
  })
  .refine(
    (data) => {
      if (data.phone && data.phone.trim().length > 0) {
        return isValidBrazilianPhone(data.phone);
      }
      return true;
    },
    {
      message: 'Informe um telefone brasileiro válido com DDD (ex: (11) 98765-4321).',
      path: ['phone'],
    },
  )
  .refine(
    (data) => {
      if (data.phoneContactAuthorized) {
        return !!data.phone && data.phone.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Informe o número do telefone para autorizar o contato.',
      path: ['phone'],
    },
  )
  .refine(
    (data) => {
      if (data.phone && data.phone.trim().length > 0) {
        return data.phoneContactAuthorized === true;
      }
      return true;
    },
    {
      message: 'Marque a autorização para permitir o contato com o número informado.',
      path: ['phoneContactAuthorized'],
    },
  );

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
