import test from 'node:test';
import assert from 'node:assert/strict';
import {
  saveSession,
  loadSession,
  clearSession,
  setSecureStoreDriver,
  SESSION_STORAGE_KEY,
} from '../src/services/auth/secure-storage.ts';
import type { SecureStoreDriver } from '../src/services/auth/secure-storage.ts';
import type { AuthTokens } from '../src/services/api/types.ts';

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

test('6. Armazenamento seguro de sessão versionada no SecureStore', async () => {
  const { driver, store } = createMockDriver();
  setSecureStoreDriver(driver);

  const sampleTokens: AuthTokens = {
    tokenType: 'Bearer',
    accessToken: 'sample_jwt_access_token',
    refreshToken: 'psrt_1.secret_123',
    accessExpiresAt: '2026-09-26T20:00:00.000Z',
    sessionExpiresAt: '2026-10-26T20:00:00.000Z',
  };

  await saveSession(sampleTokens);

  // Confirma chave de armazenamento canônica
  assert.ok(store[SESSION_STORAGE_KEY]);
  const storedJson = JSON.parse(store[SESSION_STORAGE_KEY]!);

  // Confirma versionamento estrito (v1)
  assert.equal(storedJson.version, 1);
  assert.equal(storedJson.tokenType, 'Bearer');
  assert.equal(storedJson.accessToken, sampleTokens.accessToken);
  assert.equal(storedJson.refreshToken, sampleTokens.refreshToken);
  assert.equal(storedJson.accessExpiresAt, sampleTokens.accessExpiresAt);
  assert.equal(storedJson.sessionExpiresAt, sampleTokens.sessionExpiresAt);

  // Recupera e valida via loadSession
  const loaded = await loadSession();
  assert.ok(loaded);
  assert.equal(loaded?.accessToken, sampleTokens.accessToken);
  assert.equal(loaded?.version, 1);
});

test('7. Rejeição e limpeza automática de sessão malformada ou corrompida', async () => {
  // Caso 1: JSON completamente corrompido
  const { driver: driverCorrupted, store: storeCorrupted } = createMockDriver({
    [SESSION_STORAGE_KEY]: '{ invalid_json_syntax %%%',
  });
  setSecureStoreDriver(driverCorrupted);

  const resultCorrupted = await loadSession();
  assert.equal(resultCorrupted, null);
  assert.equal(storeCorrupted[SESSION_STORAGE_KEY], undefined, 'Dado corrompido deve ser limpo');

  // Caso 2: Schema inválido (faltando campos obrigatórios ou versão diferente)
  const { driver: driverInvalidSchema, store: storeInvalidSchema } = createMockDriver({
    [SESSION_STORAGE_KEY]: JSON.stringify({
      version: 99, // versão desconhecida
      tokenType: 'Bearer',
      accessToken: 'token',
    }),
  });
  setSecureStoreDriver(driverInvalidSchema);

  const resultInvalidSchema = await loadSession();
  assert.equal(resultInvalidSchema, null);
  assert.equal(storeInvalidSchema[SESSION_STORAGE_KEY], undefined, 'Sessão com schema incompatível deve ser expurgada');

  // Caso 3: clearSession manual
  const { driver: driverClean, store: storeClean } = createMockDriver({
    [SESSION_STORAGE_KEY]: 'qualquer_coisa',
  });
  setSecureStoreDriver(driverClean);
  await clearSession();
  assert.equal(storeClean[SESSION_STORAGE_KEY], undefined);
});
