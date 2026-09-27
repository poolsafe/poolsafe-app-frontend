import test from 'node:test';
import assert from 'node:assert/strict';
import { RefreshCoordinator } from '../src/services/auth/refresh-coordinator.ts';
import type { StorageAdapter } from '../src/services/auth/refresh-coordinator.ts';
import { HttpClient } from '../src/services/api/client.ts';
import { ApiError } from '../src/services/api/errors.ts';
import type { ApiResponse, AuthTokens, RefreshResponseData } from '../src/services/api/types.ts';

function createMockStorage(): { storage: StorageAdapter; store: { session?: AuthTokens } } {
  const store: { session?: AuthTokens } = {};
  const storage: StorageAdapter = {
    saveSession: async (tokens: AuthTokens) => {
      store.session = tokens;
    },
    clearSession: async () => {
      delete store.session;
    },
    loadSession: async () => store.session ?? null,
  };
  return { storage, store };
}

test('8. Single-flight refresh - Duas ou mais requisições concorrentes produzem apenas UMA chamada à API', async () => {
  let apiRefreshCallCount = 0;
  const mockClient = {
    post: async <T>(_path: string, _body?: unknown): Promise<ApiResponse<T>> => {
      apiRefreshCallCount++;
      // Pequeno atraso para simular rede e permitir que chamadas concorrentes entrem
      await new Promise((resolve) => setTimeout(resolve, 30));
      return {
        data: {
          tokenType: 'Bearer',
          accessToken: `new_jwt_${apiRefreshCallCount}`,
          refreshToken: `psrt_99.new_secret_${apiRefreshCallCount}`,
          accessExpiresAt: '2026-09-26T21:00:00.000Z',
          sessionExpiresAt: '2026-10-26T21:00:00.000Z',
        } as unknown as T,
      };
    },
  } as unknown as HttpClient;

  const { storage, store } = createMockStorage();
  const coordinator = new RefreshCoordinator(mockClient, storage);

  const initialRefreshToken = 'psrt_99.initial_secret';

  // Dispara 5 requisições de refresh concorrentes
  const results = await Promise.all([
    coordinator.refresh(initialRefreshToken),
    coordinator.refresh(initialRefreshToken),
    coordinator.refresh(initialRefreshToken),
    coordinator.refresh(initialRefreshToken),
    coordinator.refresh(initialRefreshToken),
  ]);

  // Exatamente UMA chamada à API foi efetuada
  assert.equal(apiRefreshCallCount, 1, 'Múltiplas chamadas concorrentes devem produzir apenas um POST /auth/refresh');

  // Todas as Promises resolveram com o mesmíssimo par de tokens
  const firstToken = results[0]?.accessToken;
  for (const res of results) {
    assert.equal(res.accessToken, firstToken);
  }

  // O novo par de tokens foi gravado no armazenamento seguro antes de liberar as requisições
  assert.ok(store.session);
  assert.equal(store.session.accessToken, firstToken);
});

test('9. Refresh rejeitado com SESSION_EXPIRED ou 401 encerra a sessão e notifica listener', async () => {
  let sessionTerminated = false;
  const mockClient = {
    post: async <T>(): Promise<ApiResponse<T>> => {
      throw ApiError.fromProblemDetails({
        status: 401,
        code: 'SESSION_EXPIRED',
        title: 'Sessão expirada',
        detail: 'Sessão expirada ou revogada.',
      });
    },
  } as unknown as HttpClient;

  const { storage, store } = createMockStorage();
  store.session = {
    tokenType: 'Bearer',
    accessToken: 'old_access',
    refreshToken: 'old_refresh',
    accessExpiresAt: '...',
    sessionExpiresAt: '...',
  };

  const coordinator = new RefreshCoordinator(mockClient, storage);
  coordinator.setOnSessionTerminated(() => {
    sessionTerminated = true;
  });

  await assert.rejects(
    () => coordinator.refresh('old_refresh'),
    (err: unknown) => err instanceof ApiError && err.code === 'SESSION_EXPIRED',
  );

  // A sessão foi expurgada do SecureStore e o listener de término de sessão foi acionado
  assert.equal(store.session, undefined, 'A sessão no SecureStore deve ser limpa');
  assert.equal(sessionTerminated, true, 'O evento de encerramento da sessão deve ser disparado');
});

test('10. Falha de gravação no SecureStore encerra a sessão com segurança (token rotacionado no banco)', async () => {
  let sessionTerminated = false;
  const mockClient = {
    post: async <T>(): Promise<ApiResponse<T>> => {
      return {
        data: {
          tokenType: 'Bearer',
          accessToken: 'new_token',
          refreshToken: 'psrt_1.new_secret',
          accessExpiresAt: '...',
          sessionExpiresAt: '...',
        } as unknown as T,
      };
    },
  } as unknown as HttpClient;

  const store: { session?: AuthTokens } = {
    session: {
      tokenType: 'Bearer',
      accessToken: 'old_token',
      refreshToken: 'old_refresh',
      accessExpiresAt: '...',
      sessionExpiresAt: '...',
    },
  };

  const storageFailing: StorageAdapter = {
    saveSession: async () => {
      throw new Error('Falha no chip de segurança de hardware');
    },
    clearSession: async () => {
      delete store.session;
    },
    loadSession: async () => null,
  };

  const coordinator = new RefreshCoordinator(mockClient, storageFailing);
  coordinator.setOnSessionTerminated(() => {
    sessionTerminated = true;
  });

  await assert.rejects(() => coordinator.refresh('old_refresh'));

  // Como o novo par de tokens não pôde ser gravado, encerra com segurança
  assert.equal(store.session, undefined);
  assert.equal(sessionTerminated, true);
});
