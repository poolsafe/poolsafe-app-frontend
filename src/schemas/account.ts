import { z } from 'zod';
import { isValidBrazilianPhone } from '../utils/phone.ts';

/**
 * Schemas de validação Zod para Perfil e Alteração de Senha.
 *
 * Permite atualização de nome e gerenciamento do telefone opcional e sua autorização.
 */

export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'O nome deve ter no mínimo 2 caracteres.')
      .max(120, 'O nome deve ter no máximo 120 caracteres.'),
    phone: z.string().optional(),
    phoneContactAuthorized: z.boolean().optional(),
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
