/**
 * Testes unitários para o DeviceSyncService, Identidade de Instalação e Endpoints de Dispositivo.
 * Fatia 8B — Dispositivo e FCM Token.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { HttpClient } from '../src/services/api/client.ts';
import { ApiError } from '../src/services/api/errors.ts';
import { AuthService } from '../src/services/auth/auth-service.ts';
import { RefreshCoordinator } from '../src/services/auth/refresh-coordinator.ts';
import {
  setSecureStoreDriver,
  SESSION_STORAGE_KEY,
  clearSession,
  type SecureStoreDriver,
} from '../src/services/auth/secure-storage.ts';
import {
  getOrGenerateInstallationIdAsync,
  getInstallationIdFromStorageAsync,
  clearInstallationIdForTestingOnly,
  isValidInstallationUuid,
  INSTALLATION_ID_STORAGE_KEY,
} from '../src/services/devices/installation-id.ts';
import {
  DeviceSyncService,
  setDeviceSyncDriver,
  maskToken,
  maskInstallationId,
} from '../src/services/devices/device-sync-service.ts';
import { DevicesApiService } from '../src/services/devices/devices-api.ts';
import type {
  DeviceSyncDriver,
  PushTokenData,
  DeviceResponseData,
} from '../src/services/devices/types.ts';
import type { ApiResponse, AuthTokens } from '../src/services/api/types.ts';

function createMockSecureDriver(initialStore: Record<string, string> = {}): {
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

function createDummyTokens(): AuthTokens {
  return {
    tokenType: 'Bearer',
    accessToken: 'test_access_token_123',
    refreshToken: 'test_refresh_token_456',
    accessExpiresAt: new Date(Date.now() + 3600000).toISOString(),
    sessionExpiresAt: new Date(Date.now() + 86400000).toISOString(),
  };
}

test('1. Geração e validação do poolSafeInstallationId no SecureStore', async () => {
  const { driver, store } = createMockSecureDriver();
  setSecureStoreDriver(driver);

  const id1 = await getOrGenerateInstallationIdAsync();
  assert.ok(isValidInstallationUuid(id1), 'Deve ser um UUID v4 válido');
  assert.equal(store[INSTALLATION_ID_STORAGE_KEY], id1, 'Deve estar gravado no SecureStore');

  // Idempotência
  const id2 = await getOrGenerateInstallationIdAsync();
  assert.equal(id1, id2, 'Chamadas consecutivas devem retornar o mesmo UUID persistido');
});

test('2. Identidade corrompida no SecureStore é substituída por novo UUID válido', async () => {
  const { driver, store } = createMockSecureDriver({
    [INSTALLATION_ID_STORAGE_KEY]: 'corrupted-invalid-uuid-string',
  });
  setSecureStoreDriver(driver);

  const freshId = await getOrGenerateInstallationIdAsync();
  assert.ok(isValidInstallationUuid(freshId));
  assert.notEqual(freshId, 'corrupted-invalid-uuid-string');
  assert.equal(store[INSTALLATION_ID_STORAGE_KEY], freshId);
});

test('3. poolSafeInstallationId sobrevive a clearSession() e logout', async () => {
  const { driver, store } = createMockSecureDriver();
  setSecureStoreDriver(driver);

  const id = await getOrGenerateInstallationIdAsync();
  store[SESSION_STORAGE_KEY] = JSON.stringify({
    version: 1,
    tokenType: 'Bearer',
    accessToken: 'tok',
    refreshToken: 'ref',
    accessExpiresAt: '2026-10-08T00:00:00Z',
    sessionExpiresAt: '2026-10-09T00:00:00Z',
  });

  // Executa logout / limpeza de sessão
  await clearSession();

  assert.equal(store[SESSION_STORAGE_KEY], undefined, 'Sessão foi apagada');
  assert.equal(
    store[INSTALLATION_ID_STORAGE_KEY],
    id,
    'Identidade de instalação NUNCA pode ser apagada no logout',
  );
});

test('4. Máscaras de segurança para tokens e UUIDs na UI', async () => {
  assert.equal(maskToken(null), null);
  assert.equal(maskToken('12345'), '••••');
  assert.equal(maskToken('fcm_token_abcdef123456'), '••••123456');

  assert.equal(maskInstallationId(null), 'Não identificado');
  assert.equal(maskInstallationId('short'), 'short');
  assert.equal(
    maskInstallationId('e2a4a350-0e1d-4eb4-b81b-53cf0ec53784'),
    '••••0ec53784',
  );
});

test('5. Sincronização com sucesso: obtém token FCM nativo e chama PUT /api/v1/devices/{id}', async () => {
  const { driver } = createMockSecureDriver();
  setSecureStoreDriver(driver);

  let capturedPath = '';
  let capturedBody: unknown = null;
  let capturedToken = '';

  const mockClient = {
    put: async <T>(path: string, body?: unknown, options: { token?: string } = {}) => {
      capturedPath = path;
      capturedBody = body;
      capturedToken = options.token || '';
      const dummyRes: ApiResponse<DeviceResponseData> = {
        data: {
          id: 'dev_123',
          installationId: 'test_inst_id',
          platform: 'ANDROID',
          active: true,
          hasFcmToken: true,
          registeredAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
      return dummyRes as unknown as ApiResponse<T>;
    },
  } as unknown as HttpClient;

  const devicesApi = new DevicesApiService(mockClient);
  const authService = new AuthService(mockClient);
  const syncService = new DeviceSyncService(devicesApi, authService);

  const mockPushDriver: DeviceSyncDriver = {
    getPermissionsAsync: async () => ({ granted: true }),
    getDevicePushTokenAsync: async () => ({ type: 'fcm', data: 'native_fcm_token_abc123456789' }),
  };
  setDeviceSyncDriver(mockPushDriver);

  const tokens = createDummyTokens();
  const state = await syncService.syncDeviceAsync(tokens);

  assert.equal(state.status, 'synced');
  assert.equal(state.hasFcmToken, true);
  assert.equal(state.fcmTokenMasked, '••••456789');
  assert.ok(capturedPath.startsWith('/devices/'));
  assert.deepEqual(capturedBody, {
    platform: 'ANDROID',
    fcmToken: 'native_fcm_token_abc123456789',
  });
  assert.equal(capturedToken, tokens.accessToken);
});

test('6. Permissão de notificação negada: registra dispositivo com fcmToken: null', async () => {
  const { driver } = createMockSecureDriver();
  setSecureStoreDriver(driver);

  let capturedBody: unknown = null;

  const mockClient = {
    put: async <T>(_path: string, body?: unknown) => {
      capturedBody = body;
      return {
        data: {
          id: 'dev_1',
          installationId: 'inst_1',
          platform: 'ANDROID',
          active: true,
          hasFcmToken: false,
          registeredAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      } as ApiResponse<T>;
    },
  } as unknown as HttpClient;

  const devicesApi = new DevicesApiService(mockClient);
  const authService = new AuthService(mockClient);
  const syncService = new DeviceSyncService(devicesApi, authService);

  const mockPushDriver: DeviceSyncDriver = {
    getPermissionsAsync: async () => ({ granted: false, status: 'denied' }),
    getDevicePushTokenAsync: async () => ({ type: 'fcm', data: 'should_not_be_called' }),
  };
  setDeviceSyncDriver(mockPushDriver);

  const tokens = createDummyTokens();
  const state = await syncService.syncDeviceAsync(tokens);

  assert.equal(state.status, 'synced');
  assert.equal(state.hasFcmToken, false);
  assert.equal(state.fcmTokenMasked, null);
  assert.deepEqual(capturedBody, {
    platform: 'ANDROID',
    fcmToken: null,
  });
});

test('7. Listener de rotação de token nativo (addPushTokenListener) dispara nova sincronização', async () => {
  const { driver } = createMockSecureDriver();
  setSecureStoreDriver(driver);

  const putCalls: unknown[] = [];
  const mockClient = {
    put: async <T>(_path: string, body?: unknown) => {
      putCalls.push(body);
      return { data: {} } as ApiResponse<T>;
    },
  } as unknown as HttpClient;

  const devicesApi = new DevicesApiService(mockClient);
  const authService = new AuthService(mockClient);
  const syncService = new DeviceSyncService(devicesApi, authService);

  let registeredTokenListener: ((token: PushTokenData) => void) | null = null;
  const mockPushDriver: DeviceSyncDriver = {
    getPermissionsAsync: async () => ({ granted: true }),
    getDevicePushTokenAsync: async () => ({ type: 'fcm', data: 'initial_token_123' }),
    addPushTokenListener: (listener) => {
      registeredTokenListener = listener;
      return { remove: () => {} };
    },
  };
  setDeviceSyncDriver(mockPushDriver);

  const tokens = createDummyTokens();
  await syncService.syncDeviceAsync(tokens);
  assert.equal(putCalls.length, 1);

  // Simula rotação de token pelo sistema operacional Android / Google Play Services
  assert.ok(registeredTokenListener !== null);
  mockPushDriver.getDevicePushTokenAsync = async () => ({
    type: 'fcm',
    data: 'rotated_token_456',
  });
  const notifyListener = registeredTokenListener as (token: PushTokenData) => void;
  notifyListener({ type: 'fcm', data: 'rotated_token_456' });

  // Aguarda microtask
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(putCalls.length, 2);
  assert.deepEqual(putCalls[1], {
    platform: 'ANDROID',
    fcmToken: 'rotated_token_456',
  });
});

test('8. Concorrência: Single-flight e serialização (latest-wins)', async () => {
  const { driver } = createMockSecureDriver();
  setSecureStoreDriver(driver);

  let activeRequests = 0;
  let maxConcurrent = 0;
  let totalCalls = 0;

  const mockClient = {
    put: async <T>() => {
      activeRequests++;
      totalCalls++;
      if (activeRequests > maxConcurrent) {
        maxConcurrent = activeRequests;
      }
      await new Promise((r) => setTimeout(r, 40));
      activeRequests--;
      return { data: {} } as ApiResponse<T>;
    },
  } as unknown as HttpClient;

  const devicesApi = new DevicesApiService(mockClient);
  const authService = new AuthService(mockClient);
  const syncService = new DeviceSyncService(devicesApi, authService);

  setDeviceSyncDriver({
    getPermissionsAsync: async () => ({ granted: true }),
    getDevicePushTokenAsync: async () => ({ type: 'fcm', data: 'concurrent_token' }),
  });

  const tokens = createDummyTokens();
  // Dispara 3 requisições simultâneas
  const p1 = syncService.syncDeviceAsync(tokens);
  const p2 = syncService.syncDeviceAsync(tokens);
  const p3 = syncService.syncDeviceAsync(tokens);

  await Promise.all([p1, p2, p3]);

  assert.equal(maxConcurrent, 1, 'Nunca pode haver mais de 1 requisição em voo');
  // 1 executada + 1 rodada de continuação para o estado mais recente
  assert.ok(totalCalls <= 2, `Total de chamadas deve ser no máximo 2, foi: ${totalCalls}`);
});

test('9. Tolerância a falhas: rede instável com retries preserva estado e não apaga token', async () => {
  const { driver } = createMockSecureDriver();
  setSecureStoreDriver(driver);

  let attemptCount = 0;
  const mockClient = {
    put: async () => {
      attemptCount++;
      throw ApiError.networkError();
    },
  } as unknown as HttpClient;

  const devicesApi = new DevicesApiService(mockClient);
  const authService = new AuthService(mockClient);
  const syncService = new DeviceSyncService(devicesApi, authService);

  setDeviceSyncDriver({
    getPermissionsAsync: async () => ({ granted: true }),
    getDevicePushTokenAsync: async () => ({ type: 'fcm', data: 'token_on_network_fail' }),
  });

  const tokens = createDummyTokens();
  const state = await syncService.syncDeviceAsync(tokens);

  assert.equal(state.status, 'failed');
  assert.ok(state.error?.includes('conexão') || state.error?.includes('rede'));
  assert.ok(attemptCount > 1, 'Deve ter tentado retries antes de falhar');
});

test('10. Logout desregistra defensivamente e envia installationId na revogação', async () => {
  const { driver, store } = createMockSecureDriver();
  setSecureStoreDriver(driver);

  let unregisterCalled = false;
  let logoutPayload: unknown = null;

  const mockClient = {
    postNoContent: async (_path: string, body?: unknown) => {
      logoutPayload = body;
    },
  } as unknown as HttpClient;

  const devicesApi = new DevicesApiService(mockClient);
  const authService = new AuthService(mockClient);
  const syncService = new DeviceSyncService(devicesApi, authService);

  let listenerRemoved = false;
  setDeviceSyncDriver({
    getPermissionsAsync: async () => ({ granted: true }),
    getDevicePushTokenAsync: async () => ({ type: 'fcm', data: 'tok' }),
    addPushTokenListener: () => ({
      remove: () => {
        listenerRemoved = true;
      },
    }),
    unregisterForNotificationsAsync: async () => {
      unregisterCalled = true;
    },
  });

  const tokens = createDummyTokens();
  await syncService.syncDeviceAsync(tokens);

  const savedInstallationId = store[INSTALLATION_ID_STORAGE_KEY];
  assert.ok(savedInstallationId);

  // Executa logout do dispositivo
  await syncService.unregisterDeviceOnLogoutAsync(tokens.refreshToken);

  assert.equal(unregisterCalled, true, 'Deve ter chamado unregisterForNotificationsAsync');
  assert.equal(listenerRemoved, true, 'Deve ter removido o listener de tokens');
  assert.deepEqual(logoutPayload, {
    refreshToken: tokens.refreshToken,
    installationId: savedInstallationId,
  });
  assert.equal(
    store[INSTALLATION_ID_STORAGE_KEY],
    savedInstallationId,
    'InstallationId deve permanecer intacto no SecureStore',
  );
  assert.equal(syncService.getState().status, 'idle');
});

test('11. DevicesApiService.deleteDevice chama DELETE /devices/{installationId} com token Bearer', async () => {
  let capturedMethod = '';
  let capturedPath = '';
  let capturedToken = '';

  const mockClient = {
    deleteNoContent: async (path: string, options: { token?: string } = {}) => {
      capturedMethod = 'DELETE';
      capturedPath = path;
      capturedToken = options.token || '';
    },
  } as unknown as HttpClient;

  const devicesApi = new DevicesApiService(mockClient);
  await devicesApi.deleteDevice('e2a4a350-0e1d-4eb4-b81b-53cf0ec53784', 'test_bearer_token');

  assert.equal(capturedMethod, 'DELETE');
  assert.equal(capturedPath, '/devices/e2a4a350-0e1d-4eb4-b81b-53cf0ec53784');
  assert.equal(capturedToken, 'test_bearer_token');
});

test('12. State listeners recebem transições de estado', async () => {
  const { driver } = createMockSecureDriver();
  setSecureStoreDriver(driver);

  const mockClient = {
    put: async <T>() => ({ data: {} } as ApiResponse<T>),
  } as unknown as HttpClient;

  const devicesApi = new DevicesApiService(mockClient);
  const authService = new AuthService(mockClient);
  const syncService = new DeviceSyncService(devicesApi, authService);

  setDeviceSyncDriver({
    getPermissionsAsync: async () => ({ granted: true }),
    getDevicePushTokenAsync: async () => ({ type: 'fcm', data: 'token_val' }),
  });

  const statuses: string[] = [];
  const unsubscribe = syncService.addStateListener((s) => {
    statuses.push(s.status);
  });

  await syncService.syncDeviceAsync(createDummyTokens());
  unsubscribe();

  assert.deepEqual(statuses, ['idle', 'syncing', 'synced']);
});

test('13. Erro temporário ao consultar permissões ou obter token NÃO envia null para a API e preserva integridade remota', async () => {
  const { driver } = createMockSecureDriver();
  setSecureStoreDriver(driver);

  let apiCalled = false;
  const mockClient = {
    put: async () => {
      apiCalled = true;
      return { data: {} };
    },
  } as unknown as HttpClient;

  const devicesApi = new DevicesApiService(mockClient);
  const authService = new AuthService(mockClient);
  const syncService = new DeviceSyncService(devicesApi, authService);

  // Cenário A: Falha transitória ao checar permissões nativas
  setDeviceSyncDriver({
    getPermissionsAsync: async () => {
      throw new Error('Falha temporária ao ler permissões');
    },
    getDevicePushTokenAsync: async () => null,
  });

  const state1 = await syncService.syncDeviceAsync(createDummyTokens());
  assert.equal(state1.status, 'failed');
  assert.equal(apiCalled, false, 'API não pode ser chamada quando a verificação de permissão falha');

  // Cenário B: Permissão concedida, mas falha temporária do Firebase ao obter push token
  setDeviceSyncDriver({
    getPermissionsAsync: async () => ({ granted: true }),
    getDevicePushTokenAsync: async () => {
      throw new Error('Firebase network timeout');
    },
  });

  const state2 = await syncService.syncDeviceAsync(createDummyTokens());
  assert.equal(state2.status, 'failed');
  assert.equal(apiCalled, false, 'API JAMAIS pode ser chamada com fcmToken: null diante de erro temporário');
});

test('14. Estado de permissão "undetermined" (não decidida pelo usuário) NÃO chama a API com null, preserva o token remoto e reflete "aguardando permissão"', async () => {
  const { driver } = createMockSecureDriver();
  setSecureStoreDriver(driver);

  let apiCalled = false;
  const mockClient = {
    put: async () => {
      apiCalled = true;
      return { data: {} };
    },
  } as unknown as HttpClient;

  const devicesApi = new DevicesApiService(mockClient);
  const authService = new AuthService(mockClient);
  const syncService = new DeviceSyncService(devicesApi, authService);

  // Simula primeiro acesso / permissão ainda não solicitada ou não respondida
  setDeviceSyncDriver({
    getPermissionsAsync: async () => ({ granted: false, status: 'undetermined' }),
    getDevicePushTokenAsync: async () => null,
  });

  const state = await syncService.syncDeviceAsync(createDummyTokens());

  assert.equal(
    apiCalled,
    false,
    'API JAMAIS pode ser chamada quando o estado for undetermined (não deve apagar token remoto)',
  );
  assert.equal(
    state.status,
    'idle',
    'Permanece em status idle sem marcar como falha ou sincronizado com null',
  );
  assert.equal(state.hasPermission, false, 'hasPermission deve ser false');
  assert.equal(state.hasFcmToken, false, 'hasFcmToken deve ser false');
  assert.ok(
    state.tokenError?.includes('Aguardando permissão'),
    `tokenError deve refletir aguardando permissão, recebeu: ${state.tokenError}`,
  );
  assert.equal(state.error, null, 'Não deve gerar erro operacional na tela');
});


