/**
 * Persistência e restauração da preferência de tema do PoolSafe.
 *
 * Regras estritas (Fatia 10):
 * - Persistido via SecureStore em chave própria: 'poolsafe_theme_mode_v1'.
 * - Chave independente das credenciais de autenticação, preservada no logout.
 * - Padrão canônico na ausência de preferência válida: 'system' (Automático do Sistema).
 * - Aceita apenas modos canônicos: 'system', 'dark' ou 'light'.
 * - Tratamento defensivo de falhas de hardware seguro/storage sem travar a aplicação.
 */

import { getSecureStoreDriver, type SecureStoreDriver } from '../services/auth/secure-storage.ts';

export type ThemeMode = 'system' | 'dark' | 'light';

export const THEME_STORAGE_KEY = 'poolsafe_theme_mode_v1';

export const VALID_THEME_MODES: readonly ThemeMode[] = ['system', 'dark', 'light'] as const;

/**
 * Validador estrito de modo de tema suportado.
 */
export function isValidThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && (VALID_THEME_MODES as readonly string[]).includes(value.trim());
}

/**
 * Carrega o modo de tema persistido no armazenamento seguro.
 * Retorna 'system' caso o valor não exista, seja inválido ou ocorra falha de leitura.
 */
export async function loadStoredThemeMode(customDriver?: SecureStoreDriver): Promise<ThemeMode> {
  const driver = customDriver || getSecureStoreDriver();
  try {
    const raw = await driver.getItemAsync(THEME_STORAGE_KEY);
    if (raw && isValidThemeMode(raw)) {
      return raw.trim() as ThemeMode;
    }
    return 'system';
  } catch {
    // Falha de leitura em hardware seguro reverte de forma transparente ao padrão do sistema
    return 'system';
  }
}

/**
 * Salva a preferência de tema no armazenamento seguro.
 * Falhas de gravação são absorvidas para não interromper a navegação da aplicação.
 */
export async function saveStoredThemeMode(
  mode: ThemeMode,
  customDriver?: SecureStoreDriver,
): Promise<void> {
  if (!isValidThemeMode(mode)) {
    return;
  }

  const driver = customDriver || getSecureStoreDriver();
  try {
    await driver.setItemAsync(THEME_STORAGE_KEY, mode, {
      keychainAccessible: 1, // AFTER_FIRST_UNLOCK
    });
  } catch {
    // Falha de gravação no SecureStore não impede a utilização em memória
  }
}

/**
 * Utilitário exclusivo para testes unitários automatizados.
 */
export async function clearStoredThemeModeForTestingOnly(
  customDriver?: SecureStoreDriver,
): Promise<void> {
  const driver = customDriver || getSecureStoreDriver();
  try {
    await driver.deleteItemAsync(THEME_STORAGE_KEY);
  } catch {
    // Silencia em testes
  }
}
