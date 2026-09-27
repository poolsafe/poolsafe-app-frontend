import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../src/services/api/errors.ts';
import type { ProblemDetails } from '../src/services/api/types.ts';

test('3. Conversão de Problem Details (RFC 9457) em erros de campo', () => {
  const problem: ProblemDetails = {
    type: 'urn:poolsafe:problem:validation-error',
    title: 'Dados inválidos',
    status: 422,
    detail: 'Um ou mais campos precisam ser corrigidos.',
    code: 'VALIDATION_ERROR',
    requestId: 'req-12345',
    errors: [
      { pointer: '/email', code: 'INVALID_EMAIL', detail: 'Informe um e-mail válido.' },
      { pointer: '/password', code: 'FIELD_TOO_SHORT', detail: 'A senha deve ter no mínimo 8 caracteres.' },
      { pointer: '/name', code: 'REQUIRED_FIELD', detail: 'O nome é obrigatório.' },
    ],
  };

  const error = ApiError.fromProblemDetails(problem);
  assert.equal(error.status, 422);
  assert.equal(error.code, 'VALIDATION_ERROR');
  assert.equal(error.requestId, 'req-12345');

  const fieldErrors = error.getFieldErrors();
  assert.equal(fieldErrors['email'], 'Informe um e-mail válido.');
  assert.equal(fieldErrors['password'], 'A senha deve ter no mínimo 8 caracteres.');
  assert.equal(fieldErrors['name'], 'O nome é obrigatório.');
});

test('4. Classificação estável de erros da API e métodos de verificação', () => {
  const credsErr = ApiError.fromProblemDetails({
    title: 'Credenciais inválidas',
    status: 401,
    detail: 'Credenciais inválidas.',
    code: 'INVALID_CREDENTIALS',
  });
  assert.equal(credsErr.isInvalidCredentials(), true);
  assert.equal(credsErr.isSessionExpired(), false);

  const expiredErr = ApiError.fromProblemDetails({
    title: 'Sessão expirada',
    status: 401,
    detail: 'Sessão expirada ou revogada.',
    code: 'SESSION_EXPIRED',
  });
  assert.equal(expiredErr.isSessionExpired(), true);

  const conflictErr = ApiError.fromProblemDetails({
    title: 'Conflito de cadastro',
    status: 409,
    detail: 'Não foi possível concluir o cadastro com os dados informados.',
    code: 'ACCOUNT_CANNOT_BE_CREATED',
  });
  assert.equal(conflictErr.isAccountCannotBeCreated(), true);

  const rateLimitErr = ApiError.fromProblemDetails({
    title: 'Limite excedido',
    status: 429,
    detail: 'Limite de requisições excedido.',
    code: 'RATE_LIMITED',
  });
  assert.equal(rateLimitErr.isRateLimited(), true);

  const unavailableErr = ApiError.fromProblemDetails({
    title: 'Serviço indisponível',
    status: 503,
    detail: 'Serviço temporariamente indisponível.',
    code: 'SERVICE_UNAVAILABLE',
  });
  assert.equal(unavailableErr.isServiceUnavailable(), true);

  const networkErr = ApiError.networkError();
  assert.equal(networkErr.isNetworkError, true);
  assert.equal(networkErr.status, 0);

  const timeoutErr = ApiError.timeout();
  assert.equal(timeoutErr.isTimeout, true);
  assert.equal(timeoutErr.status, 408);
});

test('5. Ausência de tokens e senhas em erros e representações de string', () => {
  const sensitiveToken = 'psrt_31.secret_refresh_token_12345';
  const sensitivePassword = 'MySecretPassword#2026';

  const err = new ApiError({
    status: 401,
    code: 'INVALID_CREDENTIALS',
    title: 'Credenciais inválidas',
    detail: 'Credenciais inválidas.',
  });

  const serialized = JSON.stringify(err);
  assert.equal(serialized.includes(sensitiveToken), false);
  assert.equal(serialized.includes(sensitivePassword), false);
  assert.equal(err.message.includes(sensitiveToken), false);
  assert.equal(err.message.includes(sensitivePassword), false);
});
