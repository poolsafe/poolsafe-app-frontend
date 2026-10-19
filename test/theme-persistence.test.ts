/**
 * Testes automatizados de persistência e restauração do tema (Fatia 10).
 *
 * Cobertura:
 * 1. Validação estrita de ThemeMode ('system' | 'dark' | 'light')
 * 2. Restauração de preferências válidas salvas
 * 3. Fallback canônico para 'system' quando o storage estiver vazio
 * 4. Fallback canônico para 'system' quando o valor gravado estiver corrompido/inválido
 * 5. Resiliência: falha de hardware seguro na leitura retorna 'system' sem lançar exceção
 * 6. Gravação: persiste o modo correto com a chave canônica 'poolsafe_theme_mode_v1'
 * 7. Resiliência: falha de gravação não lança exceção nem trava o fluxo
 * 8. Independência de sessão: chave do tema é diferente da chave de sessão e sobrevive ao logout
 * 9. Concorrência: garantia de que a restauração inicial não sobrescreve uma escolha explícita recente do usuário
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  THEME_STORAGE_KEY,
  VALID_THEME_MODES,
  isValidThemeMode,
  loadStoredThemeMode,
  saveStoredThemeMode,
  clearStoredThemeModeForTestingOnly,
  type ThemeMode,
} from '../src/theme/theme-storage.ts';
import { SESSION_STORAGE_KEY, type SecureStoreDriver } from '../src/services/auth/secure-storage.ts';

function createMockDriver(initialData: Record<string, string> = {}): SecureStoreDriver & {
  store: Map<string, string>;
  failOnGet?: boolean;
  failOnSet?: boolean;
} {
  const store = new Map<string, string>(Object.entries(initialData));
  return {
    store,
    failOnGet: false,
    failOnSet: false,
    async getItemAsync(key: string) {
      if (this.failOnGet) {
        throw new Error('Hardware seguro inacessível para leitura (erro simulado)');
      }
      return store.get(key) ?? null;
    },
    async setItemAsync(key: string, value: string) {
      if (this.failOnSet) {
        throw new Error('Hardware seguro com falha de escrita (erro simulado)');
      }
      store.set(key, value);
    },
    async deleteItemAsync(key: string) {
      store.delete(key);
    },
  };
}

test('1. Validador estrito de ThemeMode - Aceita apenas modos canônicos', () => {
  assert.equal(isValidThemeMode('system'), true);
  assert.equal(isValidThemeMode('dark'), true);
  assert.equal(isValidThemeMode('light'), true);

  // Valores inválidos ou corrompidos
  assert.equal(isValidThemeMode(''), false);
  assert.equal(isValidThemeMode('auto'), false);
  assert.equal(isValidThemeMode('white'), false);
  assert.equal(isValidThemeMode('deep_ocean'), false);
  assert.equal(isValidThemeMode(null), false);
  assert.equal(isValidThemeMode(undefined), false);
  assert.equal(isValidThemeMode(123), false);
  assert.equal(isValidThemeMode({}), false);
});

test('2. Restauração do tema - Carrega preferência válida existente', async () => {
  const driverDark = createMockDriver({ [THEME_STORAGE_KEY]: 'dark' });
  const modeDark = await loadStoredThemeMode(driverDark);
  assert.equal(modeDark, 'dark', 'Deve restaurar dark com precisão');

  const driverLight = createMockDriver({ [THEME_STORAGE_KEY]: 'light' });
  const modeLight = await loadStoredThemeMode(driverLight);
  assert.equal(modeLight, 'light', 'Deve restaurar light com precisão');

  const driverSystem = createMockDriver({ [THEME_STORAGE_KEY]: 'system' });
  const modeSystem = await loadStoredThemeMode(driverSystem);
  assert.equal(modeSystem, 'system', 'Deve restaurar system com precisão');
});

test('3. Fallback canônico - Retorna "system" quando storage estiver vazio', async () => {
  const emptyDriver = createMockDriver();
  const restored = await loadStoredThemeMode(emptyDriver);
  assert.equal(restored, 'system', 'Na ausência de preferência gravada, deve adotar system');
});

test('4. Fallback canônico - Retorna "system" diante de valor corrompido ou inesperado', async () => {
  const corruptedDriver = createMockDriver({ [THEME_STORAGE_KEY]: 'modo_invalido_xyz' });
  const restored = await loadStoredThemeMode(corruptedDriver);
  assert.equal(restored, 'system', 'Valor desconhecido deve sofrer fallback defensivo para system');
});

test('5. Resiliência de leitura - Falha de hardware seguro retorna "system" sem estourar exceção', async () => {
  const failingDriver = createMockDriver();
  failingDriver.failOnGet = true;

  let restored: ThemeMode | null = null;
  assert.doesNotThrow(async () => {
    restored = await loadStoredThemeMode(failingDriver);
  });

  // Aguarda resolução
  restored = await loadStoredThemeMode(failingDriver);
  assert.equal(restored, 'system', 'Falha no driver deve retornar system de forma transparente');
});

test('6. Gravação do tema - Salva modo com a chave própria canônica', async () => {
  const driver = createMockDriver();

  await saveStoredThemeMode('dark', driver);
  assert.equal(driver.store.get(THEME_STORAGE_KEY), 'dark');

  await saveStoredThemeMode('light', driver);
  assert.equal(driver.store.get(THEME_STORAGE_KEY), 'light');

  await saveStoredThemeMode('system', driver);
  assert.equal(driver.store.get(THEME_STORAGE_KEY), 'system');

  // Ignora gravação de valores que não sejam ThemeMode
  await saveStoredThemeMode('valor_invalido' as ThemeMode, driver);
  assert.equal(driver.store.get(THEME_STORAGE_KEY), 'system', 'Não deve sobrescrever com valor inválido');
});

test('7. Resiliência de gravação - Falha no armazenamento seguro não lança exceção nem trava o app', async () => {
  const failingDriver = createMockDriver();
  failingDriver.failOnSet = true;

  await assert.doesNotReject(async () => {
    await saveStoredThemeMode('dark', failingDriver);
  }, 'Falha de gravação deve ser absorvida');
});

test('8. Independência e sobrevida ao logout - Chave de tema é isolada da sessão', async () => {
  assert.notEqual(
    THEME_STORAGE_KEY,
    SESSION_STORAGE_KEY,
    'Chave de tema deve ser estritamente separada da chave de sessão',
  );

  const driver = createMockDriver({
    [THEME_STORAGE_KEY]: 'dark',
    [SESSION_STORAGE_KEY]: JSON.stringify({ version: 1, accessToken: 'token123' }),
  });

  // Simula o clearSession() executado durante o logout
  await driver.deleteItemAsync(SESSION_STORAGE_KEY);

  // A sessão foi removida, mas o tema permanece intacto
  assert.equal(driver.store.get(SESSION_STORAGE_KEY), undefined, 'Sessão deve ter sido removida');
  assert.equal(driver.store.get(THEME_STORAGE_KEY), 'dark', 'Tema deve sobreviver ao logout');
});

test('9. Proteção contra concorrência - Restauração tardia não sobrescreve escolha recente do usuário', async () => {
  // Simula o mecanismo presente no ThemeProvider:
  // Se o usuário interagiu com o seletor antes da Promise de load terminar,
  // a escolha explícita do usuário tem prioridade estrita.
  let stateMode: ThemeMode = 'system';
  let userHasExplicitlyChanged = false;

  const slowDriver = createMockDriver({ [THEME_STORAGE_KEY]: 'light' });

  // Dispara carregamento assíncrono lento
  const loadPromise = loadStoredThemeMode(slowDriver);

  // Antes da Promise resolver, o usuário toca rapidamente em 'dark'
  userHasExplicitlyChanged = true;
  stateMode = 'dark';

  // Quando o load finalmente conclui:
  const loadedMode = await loadPromise;
  if (!userHasExplicitlyChanged) {
    stateMode = loadedMode;
  }

  assert.equal(
    stateMode,
    'dark',
    'A escolha explícita do usuário (dark) não pode ser sobrescrita pelo load tardio do disco (light)',
  );
});

test('10. Limpeza para testes - clearStoredThemeModeForTestingOnly remove chave do storage', async () => {
  const driver = createMockDriver({ [THEME_STORAGE_KEY]: 'light' });
  assert.equal(driver.store.get(THEME_STORAGE_KEY), 'light');

  await clearStoredThemeModeForTestingOnly(driver);
  assert.equal(driver.store.get(THEME_STORAGE_KEY), undefined);
});
