import test from 'node:test';
import assert from 'node:assert/strict';

import { updateProfileSchema, changePasswordSchema } from '../src/schemas/account.ts';
import { ApiError } from '../src/services/api/errors.ts';
import { ApiErrorCodes } from '../src/services/api/types.ts';
import { HttpClient } from '../src/services/api/client.ts';
import { AuthService } from '../src/services/auth/auth-service.ts';

test('1. Schemas de Perfil - Validação e normalização de nome', () => {
  // Caso de sucesso
  const valid = updateProfileSchema.safeParse({
    name: 'Carlos Oliveira',
  });
  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.name, 'Carlos Oliveira');
  }

  // Normalização com trim
  const trimmed = updateProfileSchema.safeParse({
    name: '   Nome com Espaços   ',
  });
  assert.equal(trimmed.success, true);
  if (trimmed.success) {
    assert.equal(trimmed.data.name, 'Nome com Espaços');
  }

  // Nome menor que 2 caracteres
  const short = updateProfileSchema.safeParse({
    name: 'A',
  });
  assert.equal(short.success, false);

  // Nome vazio após trim
  const empty = updateProfileSchema.safeParse({
    name: '   ',
  });
  assert.equal(empty.success, false);

  // Nome com 120 caracteres (limite superior)
  const maxName = updateProfileSchema.safeParse({
    name: 'A'.repeat(120),
  });
  assert.equal(maxName.success, true);

  // Nome maior que 120 caracteres
  const tooLong = updateProfileSchema.safeParse({
    name: 'A'.repeat(121),
  });
  assert.equal(tooLong.success, false);
});

test('2. Schemas de Alteração de Senha - Validação de requisitos de senha e confirmação', () => {
  // Caso de sucesso
  const valid = changePasswordSchema.safeParse({
    currentPassword: 'SenhaAtual123!',
    newPassword: 'NovaSenhaForte456!',
    newPasswordConfirmation: 'NovaSenhaForte456!',
  });
  assert.equal(valid.success, true);

  // Preservação de espaços nas extremidades e internos
  const spaces = changePasswordSchema.safeParse({
    currentPassword: '  senha atual  ',
    newPassword: '  nova senha  ',
    newPasswordConfirmation: '  nova senha  ',
  });
  assert.equal(spaces.success, true);
  if (spaces.success) {
    assert.equal(spaces.data.currentPassword, '  senha atual  ');
    assert.equal(spaces.data.newPassword, '  nova senha  ');
  }

  // Senha atual menor que 8 caracteres
  const shortCurrent = changePasswordSchema.safeParse({
    currentPassword: 'curta',
    newPassword: 'NovaSenhaForte456!',
    newPasswordConfirmation: 'NovaSenhaForte456!',
  });
  assert.equal(shortCurrent.success, false);

  // Nova senha menor que 8 caracteres
  const shortNew = changePasswordSchema.safeParse({
    currentPassword: 'SenhaAtual123!',
    newPassword: '1234567',
    newPasswordConfirmation: '1234567',
  });
  assert.equal(shortNew.success, false);

  // Confirmação divergente
  const mismatch = changePasswordSchema.safeParse({
    currentPassword: 'SenhaAtual123!',
    newPassword: 'NovaSenhaForte456!',
    newPasswordConfirmation: 'OutraSenhaCompletamenteDiferente!',
  });
  assert.equal(mismatch.success, false);
  if (!mismatch.success) {
    const errorPaths = mismatch.error.issues.map((i) => i.path.join('.'));
    assert.ok(
      errorPaths.includes('newPasswordConfirmation'),
      'O erro deve apontar para newPasswordConfirmation',
    );
  }
});

test('3. ApiError - Verificação de REAUTHENTICATION_FAILED', () => {
  const reauthErr = new ApiError({
    status: 403,
    code: ApiErrorCodes.REAUTHENTICATION_FAILED,
    title: 'Falha na reautenticação',
    detail: 'A senha atual informada está incorreta.',
  });

  assert.equal(reauthErr.isReauthenticationFailed(), true);
  assert.equal(reauthErr.isInvalidCredentials(), false);
  assert.equal(reauthErr.isSessionExpired(), false);

  const otherErr = new ApiError({
    status: 403,
    code: ApiErrorCodes.ACCESS_DENIED,
    title: 'Acesso negado',
    detail: 'Sem permissão.',
  });
  assert.equal(otherErr.isReauthenticationFailed(), false);
});

test('4. HttpClient - Suporte a PATCH, PUT e PUT No Content', async () => {
  let capturedMethod = '';
  let capturedUrl = '';
  let capturedBody = '';
  let capturedAuth = '';

  const mockClient = new HttpClient('http://test.api');
  // Sobrescreve execute para interceptar requisições
  (mockClient as any).execute = async (url: string, init: RequestInit) => {
    capturedUrl = url;
    capturedMethod = init.method || 'GET';
    capturedBody = (init.body as string) || '';
    capturedAuth = (init.headers as any)?.['Authorization'] || '';

    if (capturedMethod === 'PATCH') {
      return new Response(
        JSON.stringify({
          data: { id: '12', name: 'Nome Atualizado', email: 'dan@example.com', status: 'ATIVO' },
          meta: { requestId: 'req-patch' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (capturedMethod === 'PUT') {
      return new Response(null, { status: 204 });
    }

    return new Response(null, { status: 200 });
  };

  // Testa PATCH
  const patchRes = await mockClient.patch<any>('/users/me', { name: 'Novo Nome' }, { token: 'jwt-123' });
  assert.equal(capturedMethod, 'PATCH');
  assert.equal(capturedUrl, 'http://test.api/users/me');
  assert.equal(capturedAuth, 'Bearer jwt-123');
  assert.equal(patchRes.data.name, 'Nome Atualizado');

  // Testa PUT No Content
  await mockClient.putNoContent(
    '/users/me/password',
    { currentPassword: 'old', newPassword: 'new' },
    { token: 'jwt-456' },
  );
  assert.equal(capturedMethod, 'PUT');
  assert.equal(capturedUrl, 'http://test.api/users/me/password');
  assert.equal(capturedAuth, 'Bearer jwt-456');
  assert.ok(capturedBody.includes('newPassword'));
});

test('5. AuthService - updateProfile e changePassword chamam os endpoints corretos', async () => {
  let calledEndpoint = '';
  let calledMethod = '';
  let payloadPassed: any = null;

  const mockHttpClient = {
    async patch(path: string, body?: any, options?: any) {
      calledEndpoint = path;
      calledMethod = 'PATCH';
      payloadPassed = body;
      assert.equal(options?.token, 'access-token-xyz');
      return {
        data: {
          id: '12',
          name: body.name,
          email: 'dan@example.com',
          status: 'ATIVO',
        },
      };
    },
    async putNoContent(path: string, body?: any, options?: any) {
      calledEndpoint = path;
      calledMethod = 'PUT';
      payloadPassed = body;
      assert.equal(options?.token, 'access-token-xyz');
    },
  } as any;

  const authSvc = new AuthService(mockHttpClient, {} as any);

  // 1. updateProfile
  const user = await authSvc.updateProfile('access-token-xyz', { name: 'Dan Silva Atualizado' });
  assert.equal(calledEndpoint, '/users/me');
  assert.equal(calledMethod, 'PATCH');
  assert.equal(payloadPassed.name, 'Dan Silva Atualizado');
  assert.equal(user.name, 'Dan Silva Atualizado');

  // 2. changePassword
  await authSvc.changePassword('access-token-xyz', {
    currentPassword: 'CurrentPass123!',
    newPassword: 'NewPass456!',
  });
  assert.equal(calledEndpoint, '/users/me/password');
  assert.equal(calledMethod, 'PUT');
  assert.equal(payloadPassed.currentPassword, 'CurrentPass123!');
  assert.equal(payloadPassed.newPassword, 'NewPass456!');
});
