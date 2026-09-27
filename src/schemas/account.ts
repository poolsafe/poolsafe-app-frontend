import { z } from 'zod';

/**
 * Schemas de validação Zod para Perfil e Alteração de Senha (Fatia 3A).
 *
 * Regras estritas:
 * - Nome: 2 a 120 caracteres após normalização (.trim())
 * - Senhas: entre 8 e 128 caracteres, SEM remoção de espaços nas extremidades ou internos
 * - newPasswordConfirmation: apenas no cliente, deve coincidir exatamente com newPassword
 */

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'O nome deve ter no mínimo 2 caracteres.')
    .max(120, 'O nome deve ter no máximo 120 caracteres.'),
});

export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'Informe sua senha atual.')
      .min(8, 'A senha atual deve ter no mínimo 8 caracteres.')
      .max(128, 'A senha atual deve ter no máximo 128 caracteres.'),
    newPassword: z
      .string()
      .min(1, 'Informe sua nova senha.')
      .min(8, 'A nova senha deve ter no mínimo 8 caracteres.')
      .max(128, 'A nova senha deve ter no máximo 128 caracteres.'),
    newPasswordConfirmation: z
      .string()
      .min(1, 'Confirme sua nova senha.'),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirmation, {
    message: 'A confirmação de senha deve ser idêntica à nova senha.',
    path: ['newPasswordConfirmation'],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
