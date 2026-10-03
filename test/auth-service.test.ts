import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthService } from '../src/services/auth/auth-service.ts';
import { RefreshCoordinator } from '../src/services/auth/refresh-coordinator.ts';
import { HttpClient } from '../src/services/api/client.ts';
import { ApiError } from '../src/services/api/errors.ts';
import {
  setSecureStoreDriver,
  SESSION_STORAGE_KEY,
} from '../src/services/auth/secure-storage.ts';
import type { SecureStoreDriver } from '../src/services/auth/secure-storage.ts';
import type {
  ApiResponse,
  AuthResponseData,
  AuthTokens,
  UserProfileResponseData,
} from '../src/services/api/types.ts';

function createMockDriver(initialStore: Record<string, string> = {}): {
  driver: SecureStoreDriver;
  store: Record<string, string>;
} {
  const store = { ...initialStore };
  const driver: SecureStoreDriver = {
    getItemAsync: async (key: string) => store[key] ?? null,
    setItemAsync: async (key: string, value: string) => {
      store[key] = value;
    },
    deleteItemAsync: async (key: string) => {
      delete store[key];
    },
  };
  return { driver, store };
}

test('11. Login e Cadastro persistem tokens exclusivamente no SecureStore', async () => {
  const { driver, store } = createMockDriver();
  setSecureStoreDriver(driver);

  const mockTokens: AuthTokens = {
    tokenType: 'Bearer',
    accessToken: 'sample_access_jwt',
    refreshToken: 'psrt_10.sample_refresh',
    accessExpiresAt: '2026-09-26T21:00:00.000Z',
    sessionExpiresAt: '2026-10-26T21:00:00.000Z',
  };

  const mockClient = {
    post: async <T>(path: string): Promise<ApiResponse<T>> => {
      return {
        data: {
          user: {
            id: '10',
            name: 'Dan Silva',
            email: 'dan@example.com',
            status: 'ATIVO',
          },
          tokens: mockTokens,
        } as unknown as T,
      };
    },
  } as unknown as HttpClient;

  const coordinator = new RefreshCoordinator(mockClient);
  const service = new AuthService(mockClient, coordinator);

  // Executa login
  const loginRes = await service.login({
    email: 'dan@example.com',
    password: 'securePassword123',
  });

  assert.equal(loginRes.user.email, 'dan@example.com');
  // Confirma gravação no SecureStore
  assert.ok(store[SESSION_STORAGE_KEY]);
  const storedJson = JSON.parse(store[SESSION_STORAGE_KEY]!);
  assert.equal(storedJson.accessToken, mockTokens.accessToken);
  assert.equal(storedJson.refreshToken, mockTokens.refreshToken);
});

test('12. Restauração de sessão via /users/me com sucesso', async () => {
  const mockTokens: AuthTokens = {
    tokenType: 'Bearer',
    accessToken: 'valid_access_token',
    refreshToken: 'psrt_10.valid_refresh',
    // Válido por mais 10 minutos
    accessExpiresAt: new Date(Date.now() + 600000).toISOString(),
    sessionExpiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
  };

  const { driver } = createMockDriver({
    [SESSION_STORAGE_KEY]: JSON.stringify({
      version: 1,
      ...mockTokens,
    }),
  });
  setSecureStoreDriver(driver);

  let profileCalledWithToken = '';
  const mockClient = {
    get: async <T>(_path: string, options?: { token?: string }): Promise<ApiResponse<T>> => {
      profileCalledWithToken = options?.token || '';
      return {
        data: {
          id: '10',
          name: 'Dan Silva',
          email: 'dan@example.com',
          status: 'ATIVO',
          createdAt: '2026-09-01T12:00:00.000Z',
        } as unknown as T,
      };
    },
  } as unknown as HttpClient;

  const coordinator = new RefreshCoordinator(mockClient);
  const service = new AuthService(mockClient, coordinator);

  const restoreResult = await service.restoreSession();

  assert.equal(restoreResult.status, 'authenticated');
  if (restoreResult.status === 'authenticated') {
    assert.equal(restoreResult.user.id, '10');
    assert.equal(restoreResult.user.name, 'Dan Silva');
    assert.equal(profileCalledWithToken, mockTokens.accessToken);
  }
});

test('13. Falha de rede na inicialização preserva a sessão salva no SecureStore para nova tentativa', async () => {
  const mockTokens: AuthTokens = {
    tokenType: 'Bearer',
    accessToken: 'valid_access_token',
    refreshToken: 'psrt_10.valid_refresh',
    accessExpiresAt: new Date(Date.now() + 600000).toISOString(),
    sessionExpiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
  };

  const { driver, store } = createMockDriver({
    [SESSION_STORAGE_KEY]: JSON.stringify({
      version: 1,
      ...mockTokens,
    }),
  });
  setSecureStoreDriver(driver);

  // Cliente simula falha de conectividade / indisponibilidade
  const mockClient = {
    get: async <T>(): Promise<ApiResponse<T>> => {
      throw ApiError.networkError('Falha ao conectar com servidor.');
    },
  } as unknown as HttpClient;

  const coordinator = new RefreshCoordinator(mockClient);
  const service = new AuthService(mockClient, coordinator);

  const restoreResult = await service.restoreSession();

  // Status deve ser 'recoverable_failure'
  assert.equal(restoreResult.status, 'recoverable_failure');

  // A sessão NÃO foi apagada do SecureStore!
  assert.ok(store[SESSION_STORAGE_KEY], 'Tokens válidos não devem ser destruídos por falha temporária de rede');
});

test('14. Repetição da requisição original somente uma vez (executeWithAuth)', async () => {
  let attempts = 0;
  let refreshCalls = 0;

  const mockTokens: AuthTokens = {
    tokenType: 'Bearer',
    accessToken: 'expired_access_token',
    refreshToken: 'psrt_10.refresh_token',
    accessExpiresAt: new Date(Date.now() + 600000).toISOString(),
    sessionExpiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
  };

  const mockClient = {
    post: async <T>(): Promise<ApiResponse<T>> => {
      refreshCalls++;
      return {
        data: {
          tokenType: 'Bearer',
          accessToken: 'renewed_access_token',
          refreshToken: 'psrt_10.new_refresh_token',
          accessExpiresAt: new Date(Date.now() + 600000).toISOString(),
          sessionExpiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
        } as unknown as T,
      };
    },
  } as unknown as HttpClient;

  const coordinator = new RefreshCoordinator(mockClient);
  const service = new AuthService(mockClient, coordinator);

  const result = await service.executeWithAuth(mockTokens, async (token) => {
    attempts++;
    if (token === 'expired_access_token') {
      throw ApiError.fromProblemDetails({
        status: 401,
        code: 'AUTHENTICATION_REQUIRED',
        title: 'Token inválido',
        detail: 'Access token expirado.',
      });
    }
    return `success_with_${token}`;
  });

  assert.equal(attempts, 2, 'Deve tentar a requisição original e repetir apenas uma vez após o refresh');
  assert.equal(refreshCalls, 1, 'Deve executar apenas uma renovação');
  assert.equal(result, 'success_with_renewed_access_token');
});

test('15. Logout revoga sessão e limpa SecureStore', async () => {
  const { driver, store } = createMockDriver({
    [SESSION_STORAGE_KEY]: 'qualquer_sessao_ativa',
  });
  setSecureStoreDriver(driver);

  let logoutCalled = false;
  let receivedRefreshToken = '';
  const mockClient = {
    postNoContent: async (_path: string, body?: unknown): Promise<void> => {
      logoutCalled = true;
      const b = body as { refreshToken: string };
      receivedRefreshToken = b.refreshToken;
    },
  } as unknown as HttpClient;

  const coordinator = new RefreshCoordinator(mockClient);
  const service = new AuthService(mockClient, coordinator);

  await service.logout('psrt_10.token_para_revogar');

  assert.equal(logoutCalled, true);
  assert.equal(receivedRefreshToken, 'psrt_10.token_para_revogar');
  assert.equal(store[SESSION_STORAGE_KEY], undefined, 'SecureStore deve ser limpo no logout');
});

test('16. (Fatia 3B) AuthService - forgotPassword e resetPassword executam endpoints canônicos', async () => {
  let forgotCalled = false;
  let forgotPayload: unknown = null;
  let resetCalled = false;
  let resetPayload: unknown = null;

  const mockClient = {
    post: async <T>(path: string, body?: unknown): Promise<ApiResponse<T>> => {
      if (path === '/auth/forgot-password') {
        forgotCalled = true;
        forgotPayload = body;
        return {
          data: {
            message: 'Se a conta existir, enviaremos as instruções de recuperação.',
          } as unknown as T,
        };
      }
      throw new Error(`Rota inesperada: ${path}`);
    },
    postNoContent: async (path: string, body?: unknown): Promise<void> => {
      if (path === '/auth/reset-password') {
        resetCalled = true;
        resetPayload = body;
        return;
      }
      throw new Error(`Rota inesperada: ${path}`);
    },
  } as unknown as HttpClient;

  const service = new AuthService(mockClient, {} as unknown as RefreshCoordinator);

  // 1. forgotPassword
  const forgotResult = await service.forgotPassword('usuario@example.com');
  assert.equal(forgotCalled, true);
  assert.deepEqual(forgotPayload, { email: 'usuario@example.com' });
  assert.equal(
    forgotResult.message,
    'Se a conta existir, enviaremos as instruções de recuperação.',
  );

  // 2. resetPassword
  await service.resetPassword({
    token: 'AB7K-2P9Q',
    newPassword: 'nova-senha-segura',
  });
  assert.equal(resetCalled, true);
  assert.deepEqual(resetPayload, {
    token: 'AB7K-2P9Q',
    newPassword: 'nova-senha-segura',
  });

  // 3. Verificação de métodos em ApiError para INVALID_RESET_TOKEN e RESET_TOKEN_EXPIRED
  const invalidTokenErr = ApiError.fromProblemDetails({
    status: 422,
    code: 'INVALID_RESET_TOKEN',
    title: 'Token inválido',
    detail: 'Código inválido.',
  });
  assert.equal(invalidTokenErr.isInvalidResetToken(), true);
  assert.equal(invalidTokenErr.isResetTokenExpired(), false);

  const expiredTokenErr = ApiError.fromProblemDetails({
    status: 410,
    code: 'RESET_TOKEN_EXPIRED',
    title: 'Token expirado',
    detail: 'Código expirado.',
  });
  assert.equal(expiredTokenErr.isResetTokenExpired(), true);
  assert.equal(expiredTokenErr.isInvalidResetToken(), false);
});

